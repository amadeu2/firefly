<script lang="typescript">
    import { ActivityRow, Icon, Text, TransactionTabs, Drawer } from 'shared/components'
    import { showAppNotification } from 'shared/lib/notifications'
    import { openPopup } from 'shared/lib/popup'
    import { activeProfile, updateProfile } from 'shared/lib/profile'
    import { accountRoute, walletRoute } from 'shared/lib/router'
    import { AccountRoutes, WalletRoutes } from 'shared/lib/typings/routes'
    import {
        AccountMessage,
        api,
        asyncSyncAccounts,
        isSyncing,
        MAX_ACCOUNT_NAME_LENGTH,
        selectedAccountId,
        selectedMessage,
        WalletAccount,
    } from 'shared/lib/wallet'
    import { getContext } from 'svelte'
    import type { Readable, Writable } from 'svelte/store'
    import { get, readable } from 'svelte/store'

    export let locale
    export let mobile

    let drawer:Drawer
    
    //--------------- mobile mockuup data ----------------
    const random_range = (from, to) => Math.round(Math.random() * (to - from) +  from)
    const random_bool = () => !Math.round(Math.random())
    let mockup_msg = () => ({
        account: Math.random(),
        id: Math.random().toString(),
        //version: MessageVersion,
        parents: ['string','string'],
        payloadLength: 10,
        payload: { 
            type: 'Transaction', 
            data: {
                essence: {
                    type: 'Regular',
                    data: {
                        incoming: random_bool(),
                        //internal: !random_bool(),
                        value: random_range(50000000, 1000000000),
                        remainderValue: random_range(50000000, 1000000000),
                    }
                }
            }
        },//Payload,
        timestamp: new Date(new Date() - random_range(50000000, 1000000000)),
        nonce: Math.random(),
        confirmed: Math.random() * (1 - 0) + .5,
        broadcasted: random_bool(),
    })
    let mockup = [mockup_msg(), mockup_msg(), mockup_msg(), mockup_msg(), mockup_msg(), mockup_msg(), mockup_msg(), mockup_msg()]
    //--------------- mobile mockuup data ----------------
    
    const accounts = getContext<Writable<WalletAccount[]>>('walletAccounts')
    // TODO remove mockup!
    const transactions = readable(mockup) //getContext<Readable<AccountMessage[]>>('walletTransactions')
    
    function handleTransactionClick(transaction) {
        const sourceAccount = get(accounts).find((acc) => acc.index === transaction.account)
        if (sourceAccount) {
            selectedAccountId.set(sourceAccount.id)
            selectedMessage.set(transaction)
            walletRoute.set(WalletRoutes.Account)
            accountRoute.set(AccountRoutes.Init)
        } else {
            console.error('Could not find source account')
        }

        if (mobile) drawer.open()
    }

    function handleSyncClick() {
        api.getStrongholdStatus({
            onSuccess(strongholdStatusResponse) {
                if (strongholdStatusResponse.payload.snapshot.status === 'Locked') {
                    openPopup({ type: 'password', props: { onSuccess: async () => asyncSyncAccounts(0, 10, 1, false) } })
                } else {
                    const gapLimit = $activeProfile?.gapLimit
                    asyncSyncAccounts(gapLimit === undefined ? undefined : 0, gapLimit, 1, false)
                    updateProfile('gapLimit', undefined)
                }
            },
            onError(err) {
                showAppNotification({
                    type: 'error',
                    message: locale(err.error),
                })
            },
        })
    }

    const isWide = () => window.matchMedia('-webkit-min-device-pixel-ratio: 1.5').matches
    $: console.log(isWide())
</script>
    
{#if mobile}
    <div data-label="latest-transactions" style="height: calc(100vh / 2.1)" class="pt-6 pb-0 px-6">
        <TransactionTabs let:item={transaction} list={$transactions} {locale}>
            {#if ($activeProfile?.gapLimit === 50 && $isSyncing)}
                <Text secondary classes="text-center">{locale('general.firstSync')}</Text>
            {:else if $transactions?.length}
                <ActivityRow
                    {...transaction}
                    onClick={() => handleTransactionClick(transaction)}
                    color={$accounts.find((acc) => acc.index === transaction.account)?.color}
                    {locale}
                    includeFullSender />
            {:else}
                <Text secondary classes="text-center">{locale('general.noRecentHistory')}</Text>
            {/if}
        </TransactionTabs>
    </div>
    <Drawer config={{amount: 1, id: 1, height: 1, marginTop: 160}} opened={false} bind:this={drawer}>
        <div class="p-5 overflow-y-scroll h-full scroll-secondary">
            <Text type="h3">Transaction</Text>
            <div class="mt-10">
                <Text secondary>Reference</Text>
                <Text>For the pizza</Text>
            </div>
            <div class="mt-10 pr-5">
                <Text secondary>Input Address</Text>
                <Text type="pre">iota1qq2hdmvm9k3z5uvq6atreclgy6gc98dpshj3nd872jgqyn3dstzdvkx9crx</Text>
            </div>
            <div class="mt-10">
                <Text secondary>Receive Address</Text>
                <Text type="pre">iota1qq2hdmvm9k3z5uvq6atreclgy6gc98dpshj3nd872jgqyn3dstzdvkx9crx</Text>
            </div>
            
        </div>
    </Drawer>
{:else}
    <div data-label="latest-transactions" class="h-full pt-6 pb-8 px-8 flex-grow flex flex-col">
        <div class="w-full flex flex-row justify-between items-start">
            <Text type="h5" classes="mb-5">{locale('general.latestTransactions')}</Text>
            <button on:click={() => handleSyncClick()} class:pointer-events-none={$isSyncing}>
                <Icon icon="refresh" classes="{$isSyncing && 'animate-spin-reverse'} text-gray-500 dark:text-white" />
            </button>
        </div>
        <div class="overflow-y-auto flex-auto h-1 space-y-2.5 -mr-2 pr-2 scroll-secondary">
            {#if ($activeProfile?.gapLimit === 50 && $isSyncing)}
                <div class="h-full flex flex-col items-center justify-center text-center">
                    <Text secondary>{locale('general.firstSync')}</Text>
                </div>
            {:else if $transactions?.length}
                {#each $transactions as transaction}
                    <ActivityRow
                        {...transaction}
                        onClick={() => handleTransactionClick(transaction)}
                        color={$accounts.find((acc) => acc.index === transaction.account)?.color}
                        {locale}
                        includeFullSender />
                {/each}
            {:else}
                <div class="flex flex-col items-center justify-center text-center">
                    <Text secondary>{locale('general.noRecentHistory')}</Text>
                </div>
            {/if}
        </div>
    </div>
{/if}