import { ethers } from "ethers";
import { before, describe, it } from "node:test";
import {
  ProvingSystemId,
  VerificationData,
  getAligned,
  Option,
} from "../src/index.js";
import fs from "fs";
import assert from "assert";

describe("", () => {
  describe("Send Groth16 proof", () => {
    let proof: Buffer,
      vk: Buffer,
      pub: Buffer,
      proofGeneratorAddress: string,
      wallet: ethers.Wallet;

    before(() => {
      proof = fs.readFileSync("test_files/groth16_bn254/plonk.proof", null);
      vk = fs.readFileSync("test_files/groth16_bn254/plonk.vk", null);
      pub = fs.readFileSync(
        "test_files/groth16_bn254/plonk_pub_input.pub",
        null
      );

      proofGeneratorAddress = "0x66f9664f97F2b50F62D13eA064982f936dE76657";
      wallet = new ethers.Wallet(
        "0x7d2647ad2e1f6c1dce5abe2b5c3b9c8ecfe959e40b989d531bbf6624ff1c62df"
      );
    });

    it("submitMultiple", async () => {
      const groth16Data: VerificationData = {
        provingSystem: ProvingSystemId.Groth16Bn254,
        proof,
        publicInput: Option.from(pub),
        verificationKey: Option.from(vk),
        vmProgramCode: Option.None,
        proofGeneratorAddress,
      };

      const Alignment = getAligned();
      const alignedData = await Alignment.submitMultiple([groth16Data], wallet);
      assert(alignedData.length === 1, "Invalid response length");
    });
  });
});
