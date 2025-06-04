"use client";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useReadContract, useWalletClient } from "wagmi";
import { erc20ABI } from "@/app/onchain/erc20Token";
import { tokenContractAddresses } from "@/app/onchain/contracts";
import { formatUnits} from "viem";
import { useAppKitAccount } from "@reown/appkit/react";

export const HowItWorks = () => {
  const [step, setStep] = useState<"amount" | "receiver">("amount");
  const [amount, setAmount] = useState("");
  const [receiver, setReceiver] = useState("");
  const [selected, setSelected] = useState<number | null>(null);
  const [tokenBalance, setTokenBalance] = useState("0.0");
  const [tokenSymbol, setTokenSymbol] = useState("");
  const [fee, setFee] = useState <bigint | null>(null);

  const { address } : any = useAppKitAccount();
  const { data: walletClient } = useWalletClient();

 const tokenAddress: any = useMemo(() => {
  return selected !== null ? tokenContractAddresses[selected].contractAddress : undefined;
}, [selected]);

  //Fetch balance
  const { data: rawBalance } = useReadContract({
    address: tokenAddress,
    abi: erc20ABI,
    functionName: "balanceOf",
    args: [address],
    query: {
      enabled: !!address && !!tokenAddress,
    },
  });

  //Fetch symbol
  const { data: rawSymbol } = useReadContract({
    address: tokenAddress,
    abi: erc20ABI,
    functionName: "symbol",
    query: {
      enabled: !!tokenAddress,
    },
  });

  
  //Fetch nonce
  const { data: userNonce } = useReadContract({
    address: tokenAddress,
    abi: erc20ABI,
    functionName: "nonces",
    args: [address],
    query: {
      enabled: !!address && !!tokenAddress,
    },
  });

  useEffect(() => {
    if (rawBalance) {
      setTokenBalance(formatUnits(rawBalance as bigint, 18));
    }
    if (rawSymbol) {
      setTokenSymbol(rawSymbol.toString());
    }

  }, [rawBalance, rawSymbol, userNonce]);

  // 📝 Signing function
  const signTransfer = async ({
    token,
    to,
    amount,
    fee,
    nonce,
    verifyingContract,
    chainId,
  }: {
    token: `0x${string}`;
    to: `0x${string}`;
    amount: bigint;
    nonce: bigint;
    fee: bigint,
    verifyingContract: `0x${string}`;
    chainId: number;
  }) => {
    if (!walletClient || !address) throw new Error("Wallet not connected");
    const deadline =  BigInt(Date.now() + 3600 * 1000);
    const signature = await walletClient.signTypedData({
      account: walletClient.account,
      domain: {
        name: "CourierRelayer",
        version: "1",
        chainId,
        verifyingContract,
      },
      primaryType: "MetaTx",
      types: {
        MetaTx: [
          { name: "target", type: "address" },
          { name: "data", type: "bytes" },
          { name: "user", type: "address" },
          { name: "nonce", type: "uint256" },
          { name: "fee", type: "uint256" },
          { name: "deadline", type: "uint256" },
        ],
      },
      message: {
        target: token,
        data: "0x", // Replace with encoded function data if needed
        user: address,
        nonce: nonce,
        fee: fee,
        deadline:deadline, // +1 hour
      },
    });

    return ({signature, deadline});
  };

  // 🧾 Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step === "amount" && amount !== "") {
      setStep("receiver");
    } else if (step === "receiver" && receiver !== "" && userNonce !== null ) {
     const _fee = BigInt(Number(amount) * 0.01);
     const total = _fee + BigInt(Number(amount));
     setFee(_fee );
      // TODO: Trigger `signTransfer` here
       const token = tokenContractAddresses[selected!].contractAddress as `0x${string}`;
       const verifyingContract = "0x776bF79037D2c78F89cb4a2BA87c4370374D9928" as `0x${string}`;
       const chainId = 4202;
 
    try {
      const {signature, deadline} = await signTransfer({
        token: token,
        to: receiver as `0x${string}`,
        amount: total,
        nonce: userNonce as bigint,
        fee: _fee,
        verifyingContract,
        chainId,
      });

      const sig = signature.startsWith("0x") ? signature.slice(2) : signature;

      const r = "0x" + sig.slice(0, 64);
      const s = "0x" + sig.slice(64, 128);
      const v = parseInt(sig.slice(128, 130), 16);

      const result = await fetch("/api/relayMetaTx", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: token!,
          owner: address,
          recipient: receiver,
          amount: BigInt(amount).toString(), 
          fee: _fee.toString(),
          deadline: deadline.toString(),
          v,
          r,
          s,
        }),
      });

      console.log(result);
    } catch (error) {
      console.error("Signing failed:", error);
    }


      // Reset
      setAmount("");
      setReceiver("");
      setStep("amount");
    }else{
      console.log("somethin went wrong")
    }
  };

  const boxShadow = "0px 4px 8px rgba(0, 0, 0, 0.2)";

  return (
    <div className="form">
      <h1>
        {selected !== null
          ? `Balance: ${tokenBalance} ${tokenSymbol}`
          : "Token Balance: 0"}
      </h1>

      <form onSubmit={handleSubmit}>
        <div className="tokens">
          <ul className="flex gap-3 mb-4">
            {["/2.png", "/3.png", "/4.png", "/5.png"].map((src, idx) => (
              <li
                key={idx}
                onClick={() => setSelected(idx)}
                style={{
                  boxShadow: selected === idx ? boxShadow : "none",
                  borderRadius: "12px",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                }}
              >
                <Image src={src} alt={`token${idx}`} height={50} width={50} />
              </li>
            ))}
          </ul>
        </div>

        <div className="inputs">
          {step === "amount" ? (
            <input
              type="text"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          ) : (
            <input
              type="text"
              placeholder="Enter receiver address"
              value={receiver}
              onChange={(e) => setReceiver(e.target.value)}
            />
          )}

          <button type="submit">
            {step === "amount" ? "Next" : "Confirm"}
          </button>
        </div>
      </form>
    </div>
  );
};
