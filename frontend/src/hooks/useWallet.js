import { useEffect, useState } from "react";
import { ethers } from "ethers";

import { HARDHAT_CHAIN_ID } from "../config/contracts";

export default function useWallet() {

  const [account, setAccount] = useState("");
  const [status, setStatus] = useState("Wallet not connected");
  const [loading, setLoading] = useState(false);

  async function connectWallet() {

    try {

      if (!window.ethereum) {

        setStatus("MetaMask is not installed");
        return null;

      }

      setLoading(true);

      const provider =
        new ethers.BrowserProvider(window.ethereum);

      const network =
        await provider.getNetwork();

      if (Number(network.chainId) !== HARDHAT_CHAIN_ID) {

        setStatus("Please switch MetaMask to Hardhat Localhost");

        return null;

      }

      const accounts =
        await provider.send(
          "eth_requestAccounts",
          []
        );

      if (!accounts.length) {

        setStatus("Wallet not connected");

        setAccount("");

        return null;

      }

      setAccount(accounts[0]);

      setStatus("Wallet connected");

      return {

        provider,

        account: accounts[0],

      };

    }
    catch (error) {

      console.error(error);

      setStatus("Failed to connect wallet");

      return null;

    }
    finally {

      setLoading(false);

    }

  }

  useEffect(() => {

    if (!window.ethereum)
      return;

    async function checkWallet() {

      try {

        const provider =
          new ethers.BrowserProvider(window.ethereum);

        const network =
          await provider.getNetwork();

        if (Number(network.chainId) !== HARDHAT_CHAIN_ID) {

          setStatus("Please switch MetaMask to Hardhat Localhost");

          setAccount("");

          return;

        }

        const accounts =
          await provider.send(
            "eth_accounts",
            []
          );

        if (accounts.length) {

          setAccount(accounts[0]);

          setStatus("Wallet connected");

        }
        else {

          setAccount("");

          setStatus("Wallet not connected");

        }

      }
      catch (error) {

        console.error(error);

      }

    }

    checkWallet();

    function handleAccountsChanged(accounts) {

      if (!accounts.length) {

        setAccount("");

        setStatus("Wallet disconnected");

        return;

      }

      setAccount(accounts[0]);

      setStatus("Wallet connected");

    }

    function handleChainChanged() {

      window.location.reload();

    }

    window.ethereum.on(
      "accountsChanged",
      handleAccountsChanged
    );

    window.ethereum.on(
      "chainChanged",
      handleChainChanged
    );

    return () => {

      window.ethereum.removeListener(
        "accountsChanged",
        handleAccountsChanged
      );

      window.ethereum.removeListener(
        "chainChanged",
        handleChainChanged
      );

    };

  }, []);

  return {

    account,

    status,

    loading,

    connectWallet,

  };

}