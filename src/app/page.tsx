import { ConnectButton } from "@/components/ConnectButton";
import { Handler } from "@/components/Relayer";
export default function Home() {

  return (
    <div className={"pages"}>
      <nav className={"nav"}>
      <div className="logo"></div>
      <ConnectButton />
      </nav>
      
      {/* <ActionButtonList /> */}
      <div className="intro">
        <h1>Courier: Fast, Gasless Transfers. Delivered Instantly!</h1>
        <p> 
          Courier is a next-gen relayer dApp that enables users to send stablecoins without paying gas fees.
        </p>
        <p>
          Backed by powerful off-chain pricing and on-chain execution, Courier makes token transfers fast, affordable, and effortless.
        </p>
      <Handler/>
      </div>
      {/* <InfoList /> */}
    </div>
  );
}