import { ethers } from "ethers";
import { Constants } from "./constants.js";
import { ClientMessage, ProtocolVersion, VerificationData } from "./types.js";
import assert, { rejects } from "assert";
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
    ws.onmessage = (event: any) => {
      console.log(event.data);
    };
    ws.send(ClientMessage.toString(msg));

    console.log("sent");
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
