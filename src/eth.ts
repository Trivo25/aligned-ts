import { ethers } from "ethers";
import ContractAbi from "../abi/AlignedLayerServiceManager.json" with { type: "json" };
import { AlignedVerificationData } from "./types.js";

export { verifyProofOnchain };

const verifyProofOnchain = async (
  verificationData: AlignedVerificationData,
  chain: "devnet" | "holesky" = "holesky",
  provider: ethers.Provider
) => {
  const contractAddress =
    chain === "devnet"
      ? "0x1613beB3B2C4f22Ee086B2b38C1476A3cE7f78E8"
      : "0x58F280BeBE9B34c9939C3C39e0890C81f163B623";
  const contract = new ethers.Contract(
    contractAddress,
    ContractAbi.abi,
    provider
  );
  const verifyBatchInclusion = await contract.getFunction(
    "verifyBatchInclusion"
  );

  const flatMerklePath =
    verificationData.batchInclusionProof.merkle_path.flat();

  const result: boolean = await verifyBatchInclusion.call(
    verificationData.verificationDataCommitment.proofCommitment,
    verificationData.verificationDataCommitment.publicInputCommitment,
    verificationData.verificationDataCommitment.provingSystemAuxDataCommitment,
    verificationData.verificationDataCommitment.proofGeneratorAddr,
    verificationData.batchMerkleRoot,
    flatMerklePath,
    verificationData.indexInBatch
  );
  return result;
};
