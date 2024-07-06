import { ethers } from "ethers";
import { Constants } from "./constants.js";
import { ClientMessage, ProtocolVersion, VerificationData } from "./types.js";
import WebSocket from "ws";
import assert, { rejects } from "assert";
import { resolve } from "path";
import { openWebSocket } from "./ws.js";

export { getAligned };
export type { Aligned };

const getAligned = (address?: string): Aligned => {
  let currentInstance = address ?? Constants.DefaultAddress;

  return {
    getDefaultBatcherAddress: () => Constants.DefaultAddress,
    getCurrentBatcherAddress: () => currentInstance,
    setCurrentBatcherAddress: (address: string) => {
      currentInstance = address;
    },
    submitMultiple: (
      batcherAddress: string,
      verificationData: Array<VerificationData>,
      wallet: ethers.Wallet
    ) =>
      submitMultiple(batcherAddress, verificationData, wallet, currentInstance),
  };
};

const submitMultiple = async (
  batcherAddress: string,
  verificationData: Array<VerificationData>,
  wallet: ethers.Wallet,
  instance: string
) => {
  // check protocol version match
  const ws = await openWebSocket(instance);

  assert(verificationData.length !== 0, "Empty list of verification data");

  let sentVerificationData = [];
  verificationData.forEach(async (data) => {
    const msg = ClientMessage.from(data, wallet);

    console.log("sending");
    ws.send(JSON.stringify(msg));
    console.log("sent");

    await new Promise((resolve) => setTimeout(resolve, 100000));
  });

  return true;
};

type SubmitResult = boolean;
type Aligned = {
  submitMultiple: (
    batcherAddress: string,
    verificationData: Array<VerificationData>,
    wallet: ethers.Wallet
  ) => Promise<SubmitResult>;
  getDefaultBatcherAddress: () => string;
  getCurrentBatcherAddress: () => string;
  setCurrentBatcherAddress: (address: string) => void;
};
