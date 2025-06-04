import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";

const RPC_URL = "https://rpc.sepolia-api.lisk.com";

// Don't expose your private key with NEXT_PUBLIC
const PRIVATE_KEY = process.env.RELAYER_PRIVATE_KEY!;
const RELAYER_CONTRACT_ADDRESS = process.env.RELAYER_ADDRESS!;

const RELAYER_ABI = [
  "function executeWithPermit(address token, address owner, address recipient, uint256 amount, uint256 fee, uint256 deadline, uint8 v, bytes32 r, bytes32 s) external",
];

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
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    // Connect to contract
    const contract = new ethers.Contract(
      RELAYER_CONTRACT_ADDRESS,
      RELAYER_ABI,
      signer
    );

    // Cast amounts to BigInt and send tx
    const tx = await contract.executeWithPermit(
      token,
      owner,
      recipient,
      BigInt(amount) - BigInt(fee),
      BigInt(fee),
      BigInt(deadline),
      v,
      r,
      s
    );

    console.log("MetaTx submitted:", tx.hash);

    // Option 1: wait for confirmation
    const receipt = await tx.wait();

    return NextResponse.json({ status: "confirmed", txHash: receipt.hash });

    // Option 2: return early (uncomment to use instead)
    // return NextResponse.json({ status: "submitted", txHash: tx.hash });

  } catch (error: any) {
    console.error("MetaTx Relay Error:", error);
    return NextResponse.json(
      { status: "error", message: error.message },
      { status: 500 }
    );
  }
}
