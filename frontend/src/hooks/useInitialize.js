function useInitialize({

    connectWallet,

    loadSavingPlan,

    loadVaultBalance,

    loadUSDCBalance,

    loadMyDeposit,

}) {

    async function initialize() {

        const result =
            await connectWallet();

        if (!result)
            return;

        const {

            provider,

            account,

        } = result;

        await loadSavingPlan(provider);

        await loadVaultBalance(provider);

        await loadUSDCBalance(
            provider,
            account
        );

        await loadMyDeposit(
            provider,
            account
        );

    }

    return {

        initialize,

    };

}

export default useInitialize;