import { writable, Writable, get } from 'svelte/store'
import type { MessageResponse, Actor } from './typings/bridge'
import type { Address } from './typings/address'
import type { Message } from './typings/message'
import type { Event, TransactionEventPayload, ConfirmationStateChangeEventPayload } from './typings/events'
import { mnemonic } from 'shared/lib/app'
import { activeProfile, updateProfile } from 'shared/lib/profile'
import type { HistoryData, PriceData } from 'shared/lib/marketData'
import { HistoryDataProps } from 'shared/lib/marketData'
import { CurrencyTypes } from 'shared/lib/currency'
import { _ } from 'shared/lib/i18n'
import { Unit, convertUnits } from '@iota/unit-converter'
import { message } from './typings'
import { time } from 'svelte-i18n'

export const WALLET_STORAGE_DIRECTORY = '__storage__'

type Account = {
    id: string
    index: number
    alias: string
    addresses: Address[]
    messages: Message[]
}

interface ActorState {
    [id: string]: Actor
}

export type BalanceOverview = {
    incoming: string
    incomingRaw: number
    outgoing: string
    outgoingRaw: number
    balance: string
    balanceRaw: number
    balanceFiat: string
}

type WalletState = {
    balanceOverview: Writable<BalanceOverview>
    accounts: Writable<Account[]>
}

/** Active actors state */
const actors: ActorState = {}

/*
 * Wallet state
 */
export const wallet = writable<WalletState>({
    balanceOverview: writable<BalanceOverview>({
        incoming: '0 Mi',
        incomingRaw: 0,
        outgoing: '0 Mi',
        outgoingRaw: 0,
        balance: '0 Mi',
        balanceRaw: 0,
        balanceFiat: '0.00 USD',
    }),
    accounts: writable<Account[]>([]),
})

export const resetWallet = () => {
    const { balanceOverview, accounts } = get(wallet)
    balanceOverview.set({
        incoming: '0 Mi',
        incomingRaw: 0,
        outgoing: '0 Mi',
        outgoingRaw: 0,
        balance: '0 Mi',
        balanceRaw: 0,
        balanceFiat: '0.00 USD',
    })
    accounts.set([])
    selectedAccountId.set(null)
}

export const selectedAccountId = writable<string | null>(null)

export const api = window['__WALLET_API__']

export const getStoragePath = (appPath: string, profileName: string): string => {
    return `${appPath}/${WALLET_STORAGE_DIRECTORY}/${profileName}`
}

export const initialise = (id: string, storagePath: string): void => {
    const actor: Actor = window['__WALLET_INIT__'].run(id, storagePath)

    actors[id] = actor
}

/**
 * Destroys an actor & remove it from actors state
 *
 * @method destroyActor
 *
 * @param {string} id
 *
 * @returns {void}
 */
export const destroyActor = (id: string): void => {
    if (!actors[id]) {
        throw new Error('No actor found for provided id.')
    }

    // Destroy actor
    actors[id].destroy()

    // Delete actor id from state
    delete actors[id]
}

/**
 * Generate BIP39 Mnemonic Recovery Phrase
 */
export const generateRecoveryPhrase = (): Promise<string[]> =>
    new Promise((resolve, reject) => {
        api.generateMnemonic({
            onSuccess(response) {
                resolve(response.payload.split(' '))
            },
            onError(error) {
                reject(error)
            },
        })
    })

export const verifyRecoveryPhrase = (phrase): Promise<void> =>
    new Promise((resolve, reject) => {
        api.verifyMnemonic(phrase, {
            onSuccess(response) {
                resolve(response)
            },
            onError(error) {
                reject(error)
            },
        })
    })

export const requestMnemonic = async () => {
    let recoveryPhrase = await generateRecoveryPhrase()
    mnemonic.set(recoveryPhrase)
}

/**
 * Initialises event listeners from wallet library
 *
 * @method initialiseListeners
 *
 * @returns {void}
 */
export const initialiseListeners = () => {
    /**
     * Event listener for stronghold status change
     */
    api.onStrongholdStatusChange({
        onSuccess(response) {
            updateProfile('isStrongholdLocked', response.payload.snapshot.status === 'Locked')
        },
        onError(error) {
            console.error(error)
        },
    })

    /**
     * Event listener for new message event
     */
    api.onNewTransaction({
        onSuccess(response: Event<TransactionEventPayload>) {
            if (get(activeProfile).settings.notifications) {
                const accounts = get(wallet).accounts
                const account = get(accounts).find((account) => account.id === response.payload.accountId)
                const message = response.payload.message

                const locale = get(_) as (string) => string
                const notificationMessage = locale('notifications.valueTx')
                    .replace('{{value}}', message.value.toString())
                    .replace('{{account}}', account.alias)
                const NotificationManager = window['Electron']['NotificationManager']
                NotificationManager.notify(notificationMessage)
            }
        },
        onError(error) {
            console.error(error)
        },
    })

    api.onConfirmationStateChange({
        onSuccess(response: Event<ConfirmationStateChangeEventPayload>) {
            if (get(activeProfile).settings.notifications) {
                const accounts = get(wallet).accounts
                const account = get(accounts).find((account) => account.id === response.payload.accountId)
                const message = response.payload.message
                const messageKey = response.payload.confirmed ? 'confirmed' : 'failed'

                const locale = get(_) as (string) => string
                const notificationMessage = locale(`notifications.${messageKey}`)
                    .replace('{{value}}', message.value.toString())
                    .replace('{{account}}', account.alias)
                const NotificationManager = window['Electron']['NotificationManager']
                NotificationManager.notify(notificationMessage)
            }
        },
        onError(error) {
            console.error(error)
        },
    })

    /**
     * Event listener for balance change event
     */
    api.onBalanceChange({
        onSuccess(response) {
            console.log('Balance change response', response)
        },
        onError(error) {
            console.error(error)
        },
    })
}

/**
 * Gets latest messages
 *
 * @method getLatestMessages
 *
 * @param {Account} accounts
 * @param {number} [count]
 *
 * @returns {Message[]}
 */
export const getLatestMessages = (accounts: Account[], count = 10): Message[] => {
    const messages: Message[] = accounts.reduce(
        (messages, account) =>
            messages.concat(
                account.messages.map((message, idx) =>
                    Object.assign({}, message, {
                        account: account.index,
                        internal: idx % 2 !== 0,
                    })
                )
            ),
        []
    )

    return messages
        .slice()
        .sort((a, b) => {
            return <any>new Date(b.timestamp) - <any>new Date(a.timestamp)
        })
        .slice(0, count)
}

/**
 * Gets balance history for each account in market data timestamps
 *
 * @method getLatestMessages
 *
 * @param {Account} accounts
 * @param {PriceData} [priceData]
 *
 */
export const getAccountsBalanceHistory = (accounts: Account[], priceData: PriceData) => {
    let balanceHistory = {}
    if (priceData && accounts) {
        accounts.forEach((account) => {
            let accountBalanceHistory: HistoryData = {
                [HistoryDataProps.ONE_HOUR]: [],
                [HistoryDataProps.TWENTY_FOUR_HOURS]: [],
                [HistoryDataProps.SEVEN_DAYS]: [],
                [HistoryDataProps.ONE_MONTH]: [],
            }
            // Sort messages from last to newest
            let messages = account.messages.sort((a, b) => {
                return <any>new Date(a.timestamp).getTime() - <any>new Date(b.timestamp).getTime()
            })
            // Calculate the variations for each account
            let balanceSoFar = 0;
            let accountBalanceVariations = [{ balance: balanceSoFar, timestamp: '0' }]
            messages.forEach((message) => {
                if (message.incoming) {
                    balanceSoFar += message.value;
                } else {
                    balanceSoFar -= message.value;
                }
                accountBalanceVariations.push({ balance: balanceSoFar, timestamp: message.timestamp })
            })
            // Calculate the balance in each market data timestamp
            let balanceHistoryInTimeframe = []
            Object.entries(priceData[CurrencyTypes.USD]).forEach(([timeframe, data]) => {
                // sort market data from last to newest
                let sortedData = data.sort((a, b) => a[0] - b[0])
                balanceHistoryInTimeframe = []
                // if there are no balance variations
                if (accountBalanceVariations.length === 1) {
                    balanceHistoryInTimeframe = sortedData.map(_data => ({ timestamp: _data[0], balance: 0 }))
                }
                else {
                    let i = 1
                    sortedData.forEach(data => {
                        let data_timestamp = new Date(data[0] * 1000).getTime()
                        // find balance for each market data timepstamp
                        for (i; i < accountBalanceVariations.length; i++) {
                            let currentBalanceTimestamp = new Date(accountBalanceVariations[i].timestamp).getTime()
                            let peviousBalanceTimestamp = new Date(accountBalanceVariations[i - 1].timestamp).getTime()
                            if (data_timestamp >= peviousBalanceTimestamp && data_timestamp < currentBalanceTimestamp) {
                                balanceHistoryInTimeframe.push({ timestamp: data[0], balance: accountBalanceVariations[i - 1].balance })
                                return
                            }
                            else if (i === (accountBalanceVariations.length - 1)) {
                                balanceHistoryInTimeframe.push({ timestamp: data[0], balance: accountBalanceVariations[i].balance })
                                return
                            }
                        }
                    })
                }
                accountBalanceHistory[timeframe] = balanceHistoryInTimeframe
            })
            balanceHistory[account.index] = accountBalanceHistory
        })
    }
    return balanceHistory
}

/**
 * Gets balance history for all accounts combined in market data timestamps
 *
 * @method getLatestMessages
 *
 * @param {Account} accounts
 * @param {PriceData} [priceData]
 *
 */
export const getWalletBalanceHistory = (accountsBalanceHistory): HistoryData => {
    let balanceHistory: HistoryData = {
        [HistoryDataProps.ONE_HOUR]: [],
        [HistoryDataProps.TWENTY_FOUR_HOURS]: [],
        [HistoryDataProps.SEVEN_DAYS]: [],
        [HistoryDataProps.ONE_MONTH]: [],
    }
    Object.values(accountsBalanceHistory).forEach(accBalanceHistory => {
        Object.entries(accBalanceHistory).forEach(([timeframe, data]) => {
            if (!balanceHistory[timeframe].length) {
                balanceHistory[timeframe] = data
            }
            else {
                balanceHistory[timeframe] = balanceHistory[timeframe].map(({ balance, timestamp }, index) =>
                    ({ timestamp, balance: balance + data[index].balance })
                )
            }
        })
    })

    return balanceHistory

}

export const getAccountActivity = (account) => {
    const activityMonths = 6
    var date = new Date();
    let activityTimeframes = []
    let accountActivity = []
    let messages = account.messages.sort((a, b) => {
        return <any>new Date(a.timestamp).getTime() - <any>new Date(b.timestamp).getTime()
    })
    for (var i = 0; i < activityMonths; i++) {
        var start = new Date(date.getFullYear(), date.getMonth() - i, 1).getTime();
        var end = new Date(date.getFullYear(), date.getMonth() - i + 1, 0).getTime();
        activityTimeframes.push({ start, end })
    }
    if (account.messages.length) {
        let index = 0
        activityTimeframes.forEach(({ start, end }) => {
            let incoming = 0
            let outgoing = 0
            if (new Date(messages[messages.length - 1].timestamp).getTime() < start || new Date(messages[messages.length - 1].timestamp).getTime() > end) {
                accountActivity.push({ timestamp: start, incoming: 0, outgoing: 0 })
                return
            }
            for (index; index < messages.length; index++) {
                const message = messages[index]
                const messageTimestamp = new Date(message.timestamp).getTime()
                if (messageTimestamp >= start && messageTimestamp <= end) {
                    const valueMiota = convertUnits(message.value, Unit.i, Unit.Mi)
                    if (message.incoming) {
                        incoming += valueMiota
                    }
                    else {
                        outgoing += valueMiota
                    }
                }
                else if (messageTimestamp > end) return
            }
            accountActivity.push({ timestamp: start, incoming, outgoing })
        })
    }
    else {
        accountActivity = activityTimeframes.map(({ start, end }) => ({ timestamp: start, incoming: 0, outgoing: 0 }))
    }
    accountActivity = accountActivity.sort((a, b) => {
        return <any>new Date(a.timestamp).getTime() - <any>new Date(b.timestamp).getTime()
    })
    return accountActivity
}