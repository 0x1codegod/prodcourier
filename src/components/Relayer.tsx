"use client";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useReadContract, useWalletClient } from "wagmi";
import { erc20ABI } from "@/app/onchain/erc20Token";
import { tokenContractAddresses } from "@/app/onchain/contracts";
import { formatUnits} from "viem";
import { useAppKitAccount } from "@reown/appkit/react";
import {ethers} from "ethers";


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

  //Fetch domain separator
  const { data: domainSeparator} = useReadContract({
    address: tokenAddress,
    abi: erc20ABI,
    functionName: "DOMAIN_SEPARATOR",
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


  const getTimestampInSeconds = () => {
    // returns current timestamp in seconds
    return Math.floor(Date.now() / 1000);
  }

  // 📝 Signing function
  const signPermit = async ({
    token,
    amount,
    relayer,
    nonce,
    chainId,
    domainSeparator,
  }: {
    token: `0x${string}`;
    amount: bigint;
    relayer: `0x${string}`,
    nonce: bigint;
    chainId: any;
    domainSeparator: any;
  }) => {
    if (!walletClient || !address) throw new Error("Wallet not connected");
    const deadline =  BigInt(getTimestampInSeconds() + 4200);
    
    const domain ={
      name: tokenName! as string,
      version: "1",
      chainId: chainId,
      verifyingContract: token
    }

    const types = {
      Permit: [
        { name: 'owner', type: 'address' },
        { name: 'spender', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'nonce', type: 'uint256' },
        { name: 'deadline', type: 'uint256' },
      ],
    };


    const values = {
      owner: address,
      spender: relayer,
      value: amount,
      nonce: nonce,
      deadline: deadline,
    }

   // Check domain is correct
    if (await domainSeparator != ethers.TypedDataEncoder.hashDomain(domain)) {
        throw new Error("Invalid domain");
    }
    
    const signature = await walletClient.signTypedData({
      account: address,
      domain : domain,
      primaryType: "Permit",
      types: types,
      message: values,
    });

     // split the signature into its components
    const sig = ethers.Signature.from(signature);
    
    return ({sig, deadline});
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

     const parsedAmount = ethers.parseEther(amount);
     const _fee = parsedAmount/BigInt(100);
     const total = _fee + parsedAmount;

    if (step === "amount" && amount !== "") {
      setStep("receiver");
    } else if (step === "receiver" && receiver !== "" && userNonce !== null ) {
     
    
     //Trigger signPermit
       const token = tokenContractAddresses[selected!].contractAddress as `0x${string}`;
       const chainId = await walletClient?.getChainId();
       const relayer = "0xEECdFe9917dCC082E142A7e0fFdd7730B57A35eE";
        
        try {
          
          const {sig, deadline} = await signPermit({
            token: token,
            amount: total,
            relayer: relayer as `0x${string}`,
            nonce: userNonce as bigint,
            chainId,
            domainSeparator
          });

      const body = JSON.stringify({
          token: token!,
          owner: address,
          recipient: receiver,
          amount: total.toString(), 
          fee: _fee.toString(),
          deadline: deadline.toString(),
          v:sig.v,
          r:sig.r,
          s:sig.s,
      })

      
      setNotification({ type: "pending", message: "Transaction pending..." });
      
      const result = await fetch("/api/relayMetaTx", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: body
      });

      const {message}= await result.json();

        if (result.ok) {
        setNotification({ type: "success", message: message });
      } else {
        setNotification({ type: "error", message: `Error: ${message || "Relay failed"}` });
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
