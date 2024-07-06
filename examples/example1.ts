import fs from "fs";
import { ProvingSystemId, VerificationData, Option } from "../src/types.js";
import { ethers } from "ethers";
import { getAligned } from "../src/aligned.js";

const address = "0x1cBa13D655040D24e97967A3a4093956F4081633";
const privateKey =
  "0x7d2647ad2e1f6c1dce5abe2b5c3b9c8ecfe959e40b989d531bbf6624ff1c62df";

let sp1Proof = fs.readFileSync("test_files/sp1/sp1_fibonacci.proof", null);
let sp1Elf = fs.readFileSync("test_files/sp1/sp1_fibonacci-elf", null);

let proofGeneratorAddress = "0x66f9664f97F2b50F62D13eA064982f936dE76657";
let batcherAddress = ethers.Wallet.createRandom().publicKey;
let wallet = new ethers.Wallet(ethers.Wallet.createRandom().privateKey); // TODO

const data: VerificationData = {
  provingSystem: ProvingSystemId.SP1,
  proof: sp1Proof,
  publicInput: Option.None,
  verificationKey: Option.None,
  vmProgramCode: Option.from(sp1Elf),
  proofGeneratorAddress,
};

const Alignment = getAligned();
await Alignment.submitMultiple(batcherAddress, [data], wallet);
