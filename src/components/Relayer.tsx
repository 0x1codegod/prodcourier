"use client";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useReadContract, useWalletClient } from "wagmi";
import { erc20ABI } from "@/app/onchain/erc20Token";
import { tokenContractAddresses } from "@/app/onchain/contracts";
import { formatUnits} from "viem";
import { useAppKitAccount } from "@reown/appkit/react";
import {ethers} from "ethers";
import { signPermitTypedData, submitSignedPermitData } from "courier-client-sdk";



export const Handler = () => {
  const [step, setStep] = useState<"amount" | "receiver">("amount");
  const [amount, setAmount] = useState("");
  const [receiver, setReceiver] = useState("");
  const [selected, setSelected] = useState<number | null>(null);
  const [tokenBalance, setTokenBalance] = useState<bigint | string | null>(null);
  const [tokenSymbol, setTokenSymbol] = useState <string | null>(null);
  const [notification, setNotification] = useState<{ type: "success" | "error" | "pending" | null; message: string;} | null>(null);
  

  const { address } : any = useAppKitAccount();
  const { data: walletClient } = useWalletClient();

  const tokenAddress: any = useMemo(() => {
    return selected !== null ? tokenContractAddresses[selected].contractAddress : undefined;
    }, [selected]);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5_000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

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

  //Fetch name
  const { data: tokenName} = useReadContract({
    address: tokenAddress,
    abi: erc20ABI,
    functionName: "name",
    query: {
      enabled: !!tokenAddress,
    },
  });
  

  useEffect(() => {
    if (rawBalance) {
      setTokenBalance(formatUnits(rawBalance as bigint, 18));
    }
    if (rawSymbol) {
      setTokenSymbol(rawSymbol.toString());
    }

  }, [rawBalance, rawSymbol ]);


  const getTimestampInSeconds = () => {
    // returns current timestamp in seconds
    return Math.floor(Date.now() / 1000);
  }

  // 📝 Signing function
  const signPermit = async ({
    token,
    amount,
    owner,
  }: {
    token: `0x${string}`;
    amount: bigint;
    owner: `0x${string}`;
  }) => {
    if (!walletClient || !address) throw new Error("Wallet not connected");
    const _deadline =  BigInt(getTimestampInSeconds() + 4200);
        console.log(_deadline, "_")
    // Convert walletClient to EIP-1193 provider
    const {v, r, s, deadline } = await signPermitTypedData({owner, token, amount, deadline: _deadline, walletClient});
    
    console.log(v, r, s, deadline)
    return {v, r, s, _deadline};
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

     const parsedAmount = ethers.parseEther(amount);
     const _fee = parsedAmount/BigInt(100);

    if (step === "amount" && amount !== "") {
      setStep("receiver");
    } else if (step === "receiver" && receiver !== "" ) {
     
    
     //Trigger signPermit
       const token = tokenContractAddresses[selected!].contractAddress as `0x${string}`;
       const owner = address;
       const recipient = receiver;
        
        try {
          
          const {v,r,s, _deadline} = await signPermit({
            token: token,
            amount: parsedAmount,
            owner: address
          });
          
      const tx = await submitSignedPermitData({token, owner, recipient, amount: parsedAmount.toString(), deadline: _deadline.toString(), v, r, s,})
      const {hash} = await tx.json();
      console.log(hash);
        if (tx.ok) {
        setNotification({ type: "success", message: hash });
      } else {
        setNotification({ type: "error", message: `Error: ${hash || "Relay failed"}` });
      }
      } catch (error: any) {
      console.error("Signing failed:", error);
      setNotification({ type: "error", message: `Signing failed: ${error.message}` });
      }


      // Reset
      setAmount("");
      setReceiver("");
      setStep("amount");
    }else{
      console.log("something went wrong")
    }
  };

  const boxShadow = "0px 4px 8px rgba(0, 0, 0, 0.2)";

  return (
    <div className="form">
      <div className="info">
       { tokenBalance && (
        <div className="info1">
        <b> Wallet Balance: </b> <br />
         {` ${tokenBalance} `} <b>{ tokenSymbol}</b>
       </div>
       )} 

       {amount &&(
        <div className="info2">
          <div> <b> Fee: </b> { `${Number(amount) / 100} `} <b>{tokenSymbol}</b></div>
          <div> <b> Total: </b> { `${(Number(amount) / 100) + Number(amount)} `} <b> {tokenSymbol}</b></div>
        </div>
       )}
      </div>
      

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
      {notification && (
      <div className="notifications">
          <div style={{
            backgroundColor:
              notification?.type === "success"
                ? "rgb(209, 250, 229)"
                : notification?.type === "error"
                ? "rgb(254, 202, 202)"
                : "rgb(254, 243, 199)",
            color: "#0f172a", // Slate-900: dark text for readability
            padding: "12px",
            borderRadius: "8px",
            marginTop: "16px",
          }}
        >
          { 
          notification.type == "success" ? 
          <a href={`https://sepolia-blockscout.lisk.com/tx/${notification.message}`} target="_blank"> Txhash: { notification.message.substring(0,20)}...</a>
          : 
          notification.message}
          </div>
      </div>  
      )}

    </div>
  );
};
