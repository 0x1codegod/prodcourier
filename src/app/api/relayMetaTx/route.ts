import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import {RELAYER_ABI} from "@/app/onchain/relayer";
const RPC_URL = "https://rpc.sepolia-api.lisk.com";

// Don't expose your private key with NEXT_PUBLIC
const PRIVATE_KEY = "09870d993ae316c0c88792e885fedf81f3713944a5055b5aeb124da2da2d7d8a";
const RELAYER_CONTRACT_ADDRESS = process.env.RELAYER_ADDRESS!;



export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      token,
      owner,
      recipient, 
      amount,
      fee,
      deadline,
      v,
      r,
      s,
    } = body;

    // Validate all required fields
    if (
      !token || !owner || !recipient || !amount || !fee ||
      !deadline || v === undefined || !r || !s
    ) {
      return NextResponse.json(
        { status: "error", message: "Missing required fields" },
        { status: 400 }
      );
    }
    
    // Connect to RPC and create signer
  const provider = new ethers.JsonRpcProvider(RPC_URL, undefined, {
      staticNetwork: true
    });
    

    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    // Connect to contract
    const contract = new ethers.Contract(
      RELAYER_CONTRACT_ADDRESS,
      RELAYER_ABI,
      signer
    );

    // get network gas price
    // const gasPrice = (await provider.getFeeData()).gasPrice;

    // Cast amounts to BigInt and send tx
    const tx = await contract.Relay(
      token,
      owner,
      recipient,
      BigInt(amount),
      BigInt(fee),
      BigInt(deadline),
      v,
      r,
      s,
    );

    // Option 1: wait for confirmation
    const receipt = await tx.wait();

    return NextResponse.json({ status: "confirmed", message: receipt.hash });

  } catch (error: any) {
    console.error("MetaTx Relay Error:", error);
    return NextResponse.json(
      { status: "error", message: error.message },
      { status: 500 }
    );
  }
}
