import fs from "fs";
import { ProvingSystemId, VerificationData, Option } from "../src/types.js";
import { ethers } from "ethers";
import { getAligned } from "../src/aligned.js";

const address = "0x1cBa13D655040D24e97967A3a4093956F4081633";
const privateKey =
  "0x7d2647ad2e1f6c1dce5abe2b5c3b9c8ecfe959e40b989d531bbf6624ff1c62df";

let proof = fs.readFileSync("test_files/groth16_bn254/plonk.proof", null);
let vk = fs.readFileSync("test_files/groth16_bn254/plonk.vk", null);
let pub = fs.readFileSync("test_files/groth16_bn254/plonk_pub_input.pub", null);

let proofGeneratorAddress = "0x66f9664f97F2b50F62D13eA064982f936dE76657";
let batcherAddress = "0x815aeCA64a974297942D2Bbf034ABEe22a38A003";
let wallet = new ethers.Wallet(privateKey); // TODO

const data: VerificationData = {
  provingSystem: ProvingSystemId.Groth16Bn254,
  proof,
  publicInput: Option.from(pub),
  verificationKey: Option.from(vk),
  vmProgramCode: Option.None,
  proofGeneratorAddress,
};

const Alignment = getAligned();
const alignedData = await Alignment.submit(data, wallet);
console.log(alignedData);
console.log(Alignment.getExplorerLink(alignedData.batchMerkleRoot));
