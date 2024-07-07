import { ethers } from "ethers";
import { Constants } from "./constants.js";
import {
  Aligned,
  AlignedVerificationData,
  BatchInclusionData,
  ClientMessage,
  VerificationData,
  VerificationDataCommitment,
} from "./types.js";
import assert, { rejects } from "assert";
import { openWebSocket } from "./ws.js";
import WebSocket from "ws";
import { Keccak } from "sha3";
export { getAligned };

const getAligned = (address?: string): Aligned => {
  let currentInstance = address ?? Constants.DefaultAddress;

  return {
    getDefaultBatcherAddress: () => Constants.DefaultAddress,
    getCurrentBatcherAddress: () => currentInstance,
    setCurrentBatcherAddress: (address: string) => {
      currentInstance = address;
    },
    submit: async (verificationData: VerificationData, wallet: ethers.Wallet) =>
      (await submitMultiple([verificationData], wallet, currentInstance))[0],
    submitMultiple: (
      verificationData: Array<VerificationData>,
      wallet: ethers.Wallet
    ) => submitMultiple(verificationData, wallet, currentInstance),
    getExplorerLink: (batchMerkleRoot: string) =>
      `https://explorer.alignedlayer.com/batches/0x${batchMerkleRoot}`,
    getVerificationKeyCommitment: (vk: Buffer) => {
      const Hash = new Keccak(256);
      return Hash.update(vk).digest("hex");
    },
  };
};

const submitMultiple = async (
  verificationData: Array<VerificationData>,
  wallet: ethers.Wallet,
  instance: string
) => {
  // check protocol version match
  const ws = await openWebSocket(instance);

  assert(verificationData.length !== 0, "Empty list of verification data");

  let sentVerificationData: Array<VerificationData> = [];

  // prepare data to send
  const preparedData = verificationData.map((data) => {
    sentVerificationData.push(data);
    return ClientMessage.from(data, wallet);
  });

  let reverseCommitments = sentVerificationData
    .reverse()
    .map((data) => VerificationDataCommitment.fromData(data));

  // attach receive listener
  const receivePromise = receiveResponse(reverseCommitments.length, ws);

  // send data to batcher
  preparedData.forEach((data) => ws.send(ClientMessage.toString(data)));

  console.log("sent all verification data");
  console.log("awaiting reponse");

  const receivedData = await receivePromise;
  assert(
    receivedData.length === reverseCommitments.length,
    "Received data does not match expected data length"
  );

  const alignedVerificationData: Array<AlignedVerificationData> = [];

  receivedData.forEach((data) => {
    const commitment = reverseCommitments.pop()!;

    const verified = verifyResponse(commitment, data);
    if (verified)
      alignedVerificationData.push(
        AlignedVerificationData.from(commitment, data)
      );
  });

  // all data received and set, we should be done here
  ws.close();
  return alignedVerificationData;
};

const verifyResponse = (
  commitment: VerificationDataCommitment,
  batchInclusionProof: BatchInclusionData
) => {
  // TODO: check merkle tree and inclusion proof
  return true;
};

const receiveResponse = async (
  n: number,
  ws: WebSocket
): Promise<Array<BatchInclusionData>> => {
  return new Promise((resolve, reject) => {
    let includedData: Array<BatchInclusionData> = [];
    let i = 0;
    ws.onmessage = (event: WebSocket.MessageEvent) => {
      if (event.data instanceof Buffer)
        includedData.push(BatchInclusionData.fromBuffer(event.data));
      else throw Error("Data format not supported");
      i++;
      if (i === n) resolve(includedData);
      // TODO: set a timeout, dont let idle forever
    };
    ws.onclose = (event: WebSocket.CloseEvent) => {
      reject("Connection was closed because all data was received");
    };
  });
};
