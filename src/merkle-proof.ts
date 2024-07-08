import { Keccak } from "sha3";
import { VerificationDataCommitment } from "./types.js";

export { verifyMerklePath };

const verifyMerklePath = (
  path: Array<Uint8Array>,
  root: Uint8Array | Buffer,
  index: number,
  data: VerificationDataCommitment
) => {
  const Hash = new Keccak(256);

  let commitment = VerificationDataCommitment.hashData(data);

  path.forEach((node) => {
    const sibling = Buffer.from(node);
    if (index % 2 === 0) {
      commitment = Hash.update(commitment).update(sibling).digest();
      Hash.reset();
    } else {
      commitment = Hash.update(sibling).update(commitment).digest();
      Hash.reset();
    }
    index >>= 1;
  });

  return Buffer.from(root).equals(commitment);
};
