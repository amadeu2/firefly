<script lang="typescript">
    import { AccountTile, Button, Text, Drawer, Input } from 'shared/components'
    import { activeProfile } from 'shared/lib/profile'
    import { accountRoute, walletRoute } from 'shared/lib/router'
    import { AccountRoutes, WalletRoutes } from 'shared/lib/typings/routes'
    import { selectedAccountId, WalletAccount } from 'shared/lib/wallet'
    import { getContext } from 'svelte'
import { init } from 'svelte/internal';
    import type { Readable } from 'svelte/store'
    import { readable } from 'svelte/store'
    import { Receive, Send, CreateAccount } from '.'

    export let locale
    export let mobile
    export let send
    export let internalTransfer
    export let generateAddress
    export let isGeneratingAddress
    
    const mockup_data = [
        {
            alias: 'Alias',
            depositAddress: 'test',
            rawIotaBalance: 10,
            balance: '10 Mi',
            balanceEquiv: '10 USD',
            color: 'white',
        },
        // {
        //     alias: 'Alias',
        //     depositAddress: 'test',
        //     rawIotaBalance: 10,
        //     balance: '10 Mi',
        //     balanceEquiv: '10 USD',
        // }
    ]
    // const changed by let only for mockup, remove!
    let viewableAccounts = getContext<Readable<WalletAccount[]>>('viewableAccounts')
    const hiddenAccounts = $activeProfile?.hiddenAccounts ?? []

    $: waitingChrysalis = $activeProfile?.migratedTransactions?.length

    let drawer:Drawer
    
    function handleAccountClick(accountId) {
        selectedAccountId.set(accountId)
        walletRoute.set(WalletRoutes.Account)
        accountRoute.set(AccountRoutes.Init)
    }
    function handleCreateClick() {
        walletRoute.set(WalletRoutes.CreateAccount)
    }

    // fake handle create account
    function handleCreate() {
        viewableAccounts = readable(mockup_data)
        //drawer.close()
    }
    handleCreate()
    
    $: mobile && drawer 
        && ($walletRoute === WalletRoutes.Receive || $walletRoute === WalletRoutes.Send)
        && drawer.open() 
</script>

{#if mobile}
    {#if $walletRoute === WalletRoutes.Init 
        || $walletRoute === WalletRoutes.Send 
        || $walletRoute === WalletRoutes.Receive
        || $walletRoute === WalletRoutes.CreateAccount}
        <div class="p-8 pt-4 flex flex-col h-full justify-between">
            <div data-label="accounts" class="w-full h-full flex flex-col flex-no-wrap justify-start">
                <div class="flex flex-row mb-4 justify-between items-center">
                    <Button 
                        disabled={waitingChrysalis} 
                        onClick={handleCreateClick} 
                        mobile onlyIcon reverse shadow icon="plus" classes="absolute right-8 mt-16" />
                </div>
                {#if $viewableAccounts.length > 0}
                    {#if mobile}
                        <div
                            class="grid {$viewableAccounts.length === 1 ? 'grid-cols-1' : 'grid-cols-2'} auto-rows-max gap-4 flex-auto overflow-y-auto pr-2 scroll-secondary">
                            {#each $viewableAccounts as account}
                                <AccountTile
                                    color={account.color}
                                    name={account.alias}
                                    balance={account.balance}
                                    balanceEquiv={account.balanceEquiv}
                                    size={$viewableAccounts.length === 1 ? 'l' : 'm'}
                                    hidden={hiddenAccounts.includes(account.id)}
                                    disabled={waitingChrysalis}
                                    onClick={() => handleAccountClick(account.id)} />
                            {/each}
                        </div>
                    {:else}
                        <div
                            class="grid {$viewableAccounts.length === 1 ? 'grid-cols-1' : 'grid-cols-2'} auto-rows-max gap-4 flex-auto overflow-y-auto h-1 -mr-2 pr-2 scroll-secondary">
                            {#each $viewableAccounts as account}
                                <AccountTile
                                    color={account.color}
                                    name={account.alias}
                                    balance={account.balance}
                                    balanceEquiv={account.balanceEquiv}
                                    size={$viewableAccounts.length === 1 ? 'l' : 'm'}
                                    hidden={hiddenAccounts.includes(account.id)}
                                    disabled={waitingChrysalis}
                                    onClick={() => handleAccountClick(account.id)} />
                            {/each}
                        </div>
                    {/if}
                {:else}
                    <Text classes="{mobile && 'text-right'}">{locale('general.noAccounts')}</Text>
                {/if}
            </div>
        </div>
        <Drawer 
            config={{amount: 5, id: 2, height: 100, marginTop: 70}} 
            opened={false} 
            bind:this={drawer}
            on:close={() => walletRoute.set(WalletRoutes.Init)}>    
            {#if $walletRoute === WalletRoutes.Send}
                <Send {send} {internalTransfer} {locale} />
            {:else if $walletRoute === WalletRoutes.Receive}
                <Receive {isGeneratingAddress} {generateAddress} {locale} />
            {/if}
        </Drawer>
    {/if}
{:else}
    {#if $walletRoute === WalletRoutes.Init}
        <div class="p-8 pt-4 flex flex-col h-full justify-between">
            <div data-label="accounts" class="w-full h-full flex flex-col flex-no-wrap justify-start">
                <div class="flex flex-row mb-4 justify-between items-center">
                    <Text type="h5">{locale('general.myAccounts')}</Text>
                    <Button disabled={waitingChrysalis} onClick={handleCreateClick} secondary small showHoverText icon="plus">
                        {locale('actions.create')}
                    </Button>
                </div>
                {#if $viewableAccounts.length > 0}
                    {#if mobile}
                        <div
                            class="grid {$viewableAccounts.length === 1 ? 'grid-cols-1' : 'grid-cols-2'} auto-rows-max gap-4 flex-auto overflow-y-auto pr-2 scroll-secondary">
                            {#each $viewableAccounts as account}
                                <AccountTile
                                    color={account.color}
                                    name={account.alias}
                                    balance={account.balance}
                                    balanceEquiv={account.balanceEquiv}
                                    size={$viewableAccounts.length === 1 ? 'l' : 'm'}
                                    hidden={hiddenAccounts.includes(account.id)}
                                    disabled={waitingChrysalis}
                                    onClick={() => handleAccountClick(account.id)} />
                            {/each}
                        </div>
                    {:else}
                        <div
                            class="grid {$viewableAccounts.length === 1 ? 'grid-cols-1' : 'grid-cols-2'} auto-rows-max gap-4 flex-auto overflow-y-auto h-1 -mr-2 pr-2 scroll-secondary">
                            {#each $viewableAccounts as account}
                                <AccountTile
                                    color={account.color}
                                    name={account.alias}
                                    balance={account.balance}
                                    balanceEquiv={account.balanceEquiv}
                                    size={$viewableAccounts.length === 1 ? 'l' : 'm'}
                                    hidden={hiddenAccounts.includes(account.id)}
                                    disabled={waitingChrysalis}
                                    onClick={() => handleAccountClick(account.id)} />
                            {/each}
                        </div>
                    {/if}
                {:else}
                    <Text classes="{mobile && 'text-right'}">{locale('general.noAccounts')}</Text>
                {/if}
            </div>
        </div>
    {:else if $walletRoute === WalletRoutes.Send}
        <Send {send} {internalTransfer} {locale} />
    {:else if $walletRoute === WalletRoutes.Receive}
        <Receive {isGeneratingAddress} {generateAddress} {locale} />
    {/if}
{/if}
