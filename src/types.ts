import * as ethers from "ethers";
import { Keccak } from "sha3";

export {
  ProtocolVersion,
  Option,
  VerificationDataCommitment,
  VerificationData,
  ProvingSystemId,
  ClientMessage,
  BatchInclusionData,
  AlignedVerificationData,
  Aligned,
};

type Aligned = {
  /**
   * Submits a single verification data to the batcher for verification.
   * @param verificationData - verification data to verify
   * @param wallet - wallet that will be used to sign the data
   */
  submit: (
    verificationData: VerificationData,
    wallet: ethers.Wallet
  ) => Promise<AlignedVerificationData>;
  /**
   * Submits an array of verification data to the batcher for verification.
   * @param verificationData - Array of verification data to verify
   * @param wallet - wallet that will be used to sign the data
   */
  submitMultiple: (
    verificationData: Array<VerificationData>,
    wallet: ethers.Wallet
  ) => Promise<Array<AlignedVerificationData>>;
  /**
   * Verifies that a proof in a batch has been verified on Ethereum.
   * @param verificationData - verification data as returned by the batcher
   * @param chain - either devnet or holesky
   * @param provider - ethers provider that will be used to check Ethereum
   */
  verifyProofOnchain: (
    verificationData: AlignedVerificationData,
    chain: "devnet" | "holesky",
    provider: ethers.Provider
  ) => Promise<boolean>;
  /**
   * Gets the default batcher (websocket) address.
   */
  getDefaultBatcherAddress: () => string;
  /**
   * Gets the currently set batcher (websocket) address.
   */
  getCurrentBatcherAddress: () => string;
  /**
   * Sets the current batcher (websocket) address.
   * @param address - New address
   */
  setCurrentBatcherAddress: (address: string) => void;
  /**
   * Given a merkle root of a batch, returns the link to the explorer.
   */
  getExplorerLink: (batchMerkleRoot: Uint8Array) => string;
  /**
   * Calculates the verification key commitment.
   * @param vk - Verification key in the form of a Buffer
   */
  getVerificationKeyCommitment: (vk: Buffer) => string;
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
  toString: (id: number) => {
    switch (id) {
      case 0:
        return "GnarkPlonkBls12_381";
      case 1:
        return "GnarkPlonkBn254";
      case 2:
        return "Groth16Bn254";
      case 3:
        return "SP1";
      case 4:
        return "Halo2IPA";
      case 5:
        return "Halo2KZG";
      case 6:
        return "Risc0";
      default:
        throw Error("Unsupported proof system ID");
    }
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
  toString(data: ClientMessage) {
    const payload = {
      verification_data: {
        proving_system: ProvingSystemId.toString(
          data.verificationData.provingSystem
        ),
        proof: [...data.verificationData.proof],
        pub_input: data.verificationData.publicInput.isSome
          ? [...data.verificationData.publicInput.data!]
          : null,
        verification_key: data.verificationData.verificationKey.isSome
          ? [...data.verificationData.verificationKey.data!]
          : null,
        vm_program_code: data.verificationData.vmProgramCode.isSome
          ? [...data.verificationData.vmProgramCode.data!]
          : null,
        proof_generator_addr: data.verificationData.proofGeneratorAddress,
      },
      signature: {
        r: data.signature.r,
        s: data.signature.s,
        v: data.signature.v,
      },
    };

    return JSON.stringify(payload);
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
  hashData(data: VerificationDataCommitment) {
    const Hash = new Keccak(256);
    Hash.update(Buffer.from(data.proofCommitment));
    Hash.update(Buffer.from(data.publicInputCommitment));
    Hash.update(Buffer.from(data.provingSystemAuxDataCommitment));
    Hash.update(Buffer.from(data.proofGeneratorAddr));
    return Hash.digest();
  },
};

type AlignedVerificationData = {
  verificationDataCommitment: VerificationDataCommitment;
  batchMerkleRoot: Uint8Array;
  batchInclusionProof: InclusionProof;
  indexInBatch: number;
};
const AlignedVerificationData = {
  from(
    verificationDataCommitment: VerificationDataCommitment,
    data: BatchInclusionData
  ): AlignedVerificationData {
    return {
      verificationDataCommitment,
      ...data,
    };
  },
};

type InclusionProof = {
  merkle_path: Array<Uint8Array>;
};
type BatchInclusionData = {
  batchMerkleRoot: Uint8Array;
  batchInclusionProof: InclusionProof;
  indexInBatch: number;
};
const BatchInclusionData = {
  fromBuffer(data: Buffer) {
    const json = JSON.parse(data.toString());
    return {
      batchMerkleRoot: json.batch_merkle_root,
      batchInclusionProof: json.batch_inclusion_proof,
      indexInBatch: Number(json.index_in_batch),
    };
  },
};

type ProtocolVersion = number;
const ProtocolVersion = {
  fromBytesBuffer: (bytes: Buffer) => bytes.readInt16BE(),
};
