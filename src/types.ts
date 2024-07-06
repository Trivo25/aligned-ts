import * as ethers from "ethers";
import { Keccak } from "sha3";

export {
  ProtocolVersion,
  Option,
  VerificationDataCommitment,
  VerificationData,
  ProvingSystemId,
  ClientMessage,
};

type Option<T> = {
  isSome: boolean;
  data: T | undefined;
};
const Option = {
  from<T>(data: T): Option<T> {
    return {
      isSome: true,
      data,
    };
  },
  None: {
    isSome: false,
    data: undefined,
  },
};

type ProvingSystemId = number;
const ProvingSystemId = {
  GnarkPlonkBls12_381: 0,
  GnarkPlonkBn254: 1,
  Groth16Bn254: 2,
  SP1: 3,
  Halo2KZG: 4,
  Halo2IPA: 5,
  Risc0: 6,
  fromString: (provingSystem: string) => {
    throw Error("TODO");
  },
};

type VerificationData = {
  provingSystem: ProvingSystemId;
  proof: Uint8Array | Buffer;
  publicInput: Option<Uint8Array | Buffer>;
  verificationKey: Option<Uint8Array | Buffer>;
  vmProgramCode: Option<Uint8Array | Buffer>;
  proofGeneratorAddress: string;
};

const VerificationCommitmentBatch = {
  hash(data: VerificationDataCommitment) {
    const Hash = new Keccak(256);

    Hash.update(Buffer.from(data.proofCommitment));
    Hash.update(Buffer.from(data.publicInputCommitment));
    Hash.update(Buffer.from(data.provingSystemAuxDataCommitment));
    Hash.update(Buffer.from(data.proofGeneratorAddr));
    return Hash.digest();
  },
};

type ClientMessage = {
  verificationData: VerificationData;
  signature: ethers.Signature;
};
const ClientMessage = {
  from(
    verificationData: VerificationData,
    wallet: ethers.Wallet
  ): ClientMessage {
    const commitment = VerificationDataCommitment.fromData(verificationData);
    const commitmentBatch = VerificationCommitmentBatch.hash(commitment);
    const signature = wallet.signMessageSync(commitmentBatch);
    return {
      verificationData,
      signature: ethers.Signature.from(signature),
    };
  },
};

type VerificationDataCommitment = {
  proofCommitment: Uint8Array;
  publicInputCommitment: Uint8Array;
  provingSystemAuxDataCommitment: Uint8Array;
  proofGeneratorAddr: Uint8Array;
};
const VerificationDataCommitment = {
  fromData(data: VerificationData): VerificationDataCommitment {
    const Hash = new Keccak(256);

    // proof commitment
    let proofCommitment = Hash.update(Buffer.from(data.proof)).digest();
    Hash.reset();
    // compute public input commitment
    let publicInputCommitment = Buffer.from(new Array(32).fill(0));
    publicInputCommitment = data.publicInput.isSome
      ? Hash.update(Buffer.from(data.publicInput.data!)).digest()
      : publicInputCommitment;
    Hash.reset();
    // aux commitment
    let provingSystemAuxDataCommitment = Buffer.from(new Array(32).fill(0));
    if (data.vmProgramCode.isSome) {
      provingSystemAuxDataCommitment = Hash.update(
        Buffer.from(data.vmProgramCode.data!)
      ).digest();
      Hash.reset();
    } else if (data.verificationKey.isSome) {
      provingSystemAuxDataCommitment = Hash.update(
        Buffer.from(data.verificationKey.data!)
      ).digest();
      Hash.reset();
    }

    let proofGeneratorAddr = ethers.getBytes(data.proofGeneratorAddress);
    return {
      proofCommitment,
      publicInputCommitment,
      provingSystemAuxDataCommitment,
      proofGeneratorAddr,
    };
  },
};

type ProtocolVersion = number;
const ProtocolVersion = {
  fromBytesBuffer: (bytes: Buffer) => bytes.readInt16BE(),
};
