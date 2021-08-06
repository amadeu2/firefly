<script lang="typescript">
    import { AccountTile, Button, Text, Drawer, Input } from 'shared/components'
    import { activeProfile } from 'shared/lib/profile'
    import { accountRoute, walletRoute } from 'shared/lib/router'
    import { AccountRoutes, WalletRoutes } from 'shared/lib/typings/routes'
    import { selectedAccountId, WalletAccount } from 'shared/lib/wallet'
    import { getContext } from 'svelte'
    import type { Readable } from 'svelte/store'
    import { readable } from 'svelte/store'
    import { Receive, Send } from '.'

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
        }
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
        if (mobile) {
            drawer.open()            
        } else {
            walletRoute.set(WalletRoutes.CreateAccount)
        }
    }

    // fake handle create account
    function handleCreate() {
        viewableAccounts = readable(mockup_data)
        drawer.close()
    }
</script>

{#if $walletRoute === WalletRoutes.Init}
    <div class="p-8 pt-4 flex flex-col h-full justify-between">
        <div data-label="accounts" class="w-full h-full flex flex-col flex-no-wrap justify-start">
            <div class="flex flex-row mb-4 justify-between items-center">
                {#if mobile}
                    <Button 
                        disabled={waitingChrysalis} 
                        onClick={handleCreateClick} 
                        mobile onlyIcon reverse shadow icon="plus" classes="absolute right-8 mt-20" />
                {:else}
                    <Text type="h5">{locale('general.myAccounts')}</Text>
                    <Button disabled={waitingChrysalis} onClick={handleCreateClick} secondary small showHoverText icon="plus">
                        {locale('actions.create')}
                    </Button>
                    {/if}
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
                {#if mobile}
                    <Text classes="text-right">{locale('general.noAccounts')}</Text>
                {:else}
                    <Text>{locale('general.noAccounts')}</Text>
                {/if}
            {/if}
        </div>
    </div>
    {#if mobile}
        <Drawer 
            config={{amount: 5, id: 2, height: 100, marginTop: 70}} 
            opened={false} 
            bind:this={drawer}>
            <div class="p-5 overflow-y-scroll h-full scroll-secondary">
                <div>
                    <div class="flex flex-row mb-6">
                        <Text type="h4">{locale('general.createAccount')}</Text>
                    </div>
                    <div class="w-full h-full flex flex-col justify-between">
                        <Input
                            placeholder={locale('general.accountName')}
                            autofocus
                            submitHandler={handleCreateClick} />
                    </div>
                    <div class="flex flex-row mb-6 mt-6">
                        <Text type="h5">{locale('Account color')}</Text>
                    </div>
                    <div class="w-full h-full grid grid-cols-6 justify-items-center items-center gap-2">
                        {#each new Array(30) as color}
                            <Button mobile classes="bg-white" />
                        {/each}
                    </div>
                    <div class="flex flex-row justify-between px-2 pt-10">
                        <Button secondary classes="-mx-2 w-1/2">{locale('actions.cancel')}</Button>
                        <Button
                            classes="-mx-2 w-1/2"
                            onClick={() => handleCreate()}>
                            {locale('actions.create')}
                        </Button>
                    </div>
                </div>
            </div>
        </Drawer>
    {/if}
{:else if $walletRoute === WalletRoutes.Send}
    <Send {send} {internalTransfer} {locale} />
{:else if $walletRoute === WalletRoutes.Receive}
    <Receive {isGeneratingAddress} {generateAddress} {locale} />
{/if}
