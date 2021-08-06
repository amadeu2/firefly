<script lang="typescript">
    import { Idle, Sidebar, Drawer } from 'shared/components'
    import { loggedIn, logout, sendParams } from 'shared/lib/app'
    import { appSettings } from 'shared/lib/appSettings'
    import { deepLinkRequestActive } from 'shared/lib/deepLinking'
    import { Electron } from 'shared/lib/electron'
    import { chrysalisLive, ongoingSnapshot, openSnapshotPopup, pollChrysalisStatus } from 'shared/lib/migration'
    import { NOTIFICATION_TIMEOUT_NEVER, removeDisplayNotification, showAppNotification } from 'shared/lib/notifications'
    import { closePopup, openPopup } from 'shared/lib/popup'
    import { activeProfile } from 'shared/lib/profile'
    import { accountRoute, dashboardRoute, routerNext, walletRoute } from 'shared/lib/router'
    import { AccountRoutes, Tabs, WalletRoutes } from 'shared/lib/typings/routes'
    import { parseDeepLink } from 'shared/lib/utils'
    import { api, selectedAccountId, STRONGHOLD_PASSWORD_CLEAR_INTERVAL_SECS, wallet } from 'shared/lib/wallet'
    import { Settings, Wallet } from 'shared/routes'
    import { onDestroy, onMount } from 'svelte'
    import { get } from 'svelte/store'

    export let locale
    export let mobile

    const tabs = {
        wallet: Wallet,
        settings: Settings,
    }
    const drawer_menu = {
		amount: 4,
		id: 1, // Defines place of button, based on amount
		icon_size: 162,
		icon: 'wallet',
		height: 60,
		marginTop: 20,
	};
    const { accountsLoaded } = $wallet

    let startInit
    let chrysalisStatusUnsubscribe
    let busy
    let migrationNotificationId

    ongoingSnapshot.subscribe((os) => {
        if (os) {
            openSnapshotPopup()
        }
    });

    onMount(async () => {
        //api.setStrongholdPasswordClearInterval({ secs: STRONGHOLD_PASSWORD_CLEAR_INTERVAL_SECS, nanos: 0 })

        // TODO: Re-enable deep links
        // Electron.DeepLinkManager.requestDeepLink()
        // Electron.onEvent('deep-link-params', (data) => handleDeepLinkRequest(data))

        // Electron.onEvent('menu-logout', () => {
        //     logout()
        // })

        // Electron.onEvent('notification-activated', (contextData) => {
        //     if (contextData) {
        //         if (
        //             (contextData.type === 'confirmed' || contextData.type === 'failed' || contextData.type === 'valueTx') &&
        //             contextData.accountId
        //         ) {
        //             selectedAccountId.set(contextData.accountId)
        //             if (get(dashboardRoute) !== Tabs.Wallet) {
        //                 dashboardRoute.set(Tabs.Wallet)
        //             }
        //             walletRoute.set(WalletRoutes.Account)
        //             accountRoute.set(AccountRoutes.Init)
        //         }
        //     }
        // })

        if ($activeProfile?.migratedTransactions?.length) {
            await pollChrysalisStatus()
        }
    })

    onDestroy(() => {
        if (chrysalisStatusUnsubscribe) {
            chrysalisStatusUnsubscribe()
        }
        if (migrationNotificationId) {
            removeDisplayNotification(migrationNotificationId)
        }
    })

    // TODO: re-enable deep links
    // /**
    //  * Handles deep link request
    //  * If deep linking is enabled, fill send input parameters
    //  * If deep linking is disabled, direct user to settings
    //  */
    // const handleDeepLinkRequest = (data) => {
    //     const parsedData = parseDeepLink(data)
    //     const _redirect = (tab) => {
    //         deepLinkRequestActive.set(true)
    //         if (get(dashboardRoute) !== tab) {
    //             dashboardRoute.set(tab)
    //         }
    //     }

    //     if (!$appSettings.deepLinking) {
    //         _redirect(Tabs.Settings)
    //         // TODO: Add alert system
    //         console.log('deep linking not enabled')
    //     } else if (parsedData) {
    //         _redirect(Tabs.Wallet)
    //         sendParams.set(parsedData)
    //     } else {
    //         console.log('error parsing')
    //     }
    // }

    // $: {
    //     if ($deepLinkRequestActive && $appSettings.deepLinking) {
    //         walletRoute.set(WalletRoutes.Send)
    //         deepLinkRequestActive.set(false)
    //     }
    // }

    if ($walletRoute === WalletRoutes.Init && !$accountsLoaded && $loggedIn) {
        startInit = Date.now()
        busy = true
        openPopup({
            type: 'busy',
            hideClose: true,
            fullScreen: true,
            transition: false,
        })
    }
    $: {
        if ($accountsLoaded) {
            const minTimeElapsed = 3000 - (Date.now() - startInit)
            if (minTimeElapsed < 0) {
                busy = false
                closePopup()
            } else {
                setTimeout(() => {
                    busy = false
                    closePopup()
                }, minTimeElapsed)
            }
        }
    }

    $: if (!busy && $accountsLoaded) {
        if (get(activeProfile)?.migratedTransactions?.length) {
            handleChrysalisStatusNotifications()
        }
    }
    $: if ($activeProfile) {
        if (!get(activeProfile)?.migratedTransactions?.length && migrationNotificationId) {
            removeDisplayNotification(migrationNotificationId)
            migrationNotificationId = null
            if (chrysalisStatusUnsubscribe) {
                chrysalisStatusUnsubscribe()
                chrysalisStatusUnsubscribe = null
            }
        }
    }

    function handleChrysalisStatusNotifications() {
        chrysalisStatusUnsubscribe = chrysalisLive.subscribe((live) => {
            if (typeof live === 'boolean' && live === false) {
                removeDisplayNotification(migrationNotificationId) // clean first otherwise it shows up while whatching
                migrationNotificationId = null
                if (get(activeProfile)?.migratedTransactions?.length) {
                    migrationNotificationId = showAppNotification({
                        type: 'warning',
                        message: locale('notifications.migratedAccountChrysalisDown'),
                        progress: undefined,
                        timeout: NOTIFICATION_TIMEOUT_NEVER,
                        actions: [
                            {
                                label: locale('actions.viewStatus'),
                                isPrimary: true,
                                callback: () => Electron.openUrl('https://chrysalis.iota.org'),
                            },
                            {
                                label: locale('actions.dismiss'),
                                callback: () => removeDisplayNotification(migrationNotificationId),
                            },
                        ],
                    })
                }
            } else if (typeof live === 'boolean' && live === true) {
                removeDisplayNotification(migrationNotificationId)
                migrationNotificationId = null
                if ($activeProfile?.migratedTransactions?.length) {
                    migrationNotificationId = showAppNotification({
                        type: 'warning',
                        message: locale('notifications.migratedAccountChrysalisUp'),
                        progress: undefined,
                        timeout: NOTIFICATION_TIMEOUT_NEVER,
                        actions: [
                            {
                                label: locale('actions.viewStatus'),
                                isPrimary: true,
                                callback: () => Electron.openUrl('https://chrysalis.iota.org'),
                            },
                            {
                                label: locale('actions.dismiss'),
                                callback: () => removeDisplayNotification(migrationNotificationId),
                            },
                        ],
                    })
                }
            }
        })
    }
</script>

{#if mobile}
    <!-- <Idle /> -->
    <div class="flex flex-row w-full h-full">
        <!-- <Sidebar {locale} /> -->
        <!-- Dashboard Pane -->
        <svelte:component this={tabs[$dashboardRoute]} {locale} on:next={routerNext} {mobile} />
    </div>
    <!-- <Drawer config={drawer_menu} opened={true}>
        <div class="p-5 overflow-y-scroll h-full scroll-secondary">Leonardo da Vinci[b] (15 April 1452 – 2 May 1519) was an Italian polymath of the High Renaissance who was active as a painter, draughtsman, engineer, scientist, theorist, sculptor and architect.[3] While his fame initially rested on his achievements as a painter, he also became known for his notebooks, in which he made drawings and notes on a variety of subjects, including anatomy, astronomy, botany, cartography, painting, and paleontology. Leonardo's genius epitomized the Renaissance humanist ideal,[4] and his collective works compose a contribution to later generations of artists matched only by that of his younger contemporary, Michelangelo.[3][4]

            Born out of wedlock to a successful notary and a lower-class woman in, or near, Vinci, he was educated in Florence by the renowned Italian painter and sculptor Andrea del Verrocchio. He began his career in the city, but then spent much time in the service of Ludovico Sforza in Milan. Later, he worked in Florence and Milan again, as well as briefly in Rome, all while attracting a large following of imitators and students. Upon the invitation of Francis I, he spent his last three years in France, where he died in 1519. Since his death, there has not been a time where his achievements, diverse interests, personal life, and empirical thinking have failed to incite interest and admiration,[3][4] making him a frequent namesake and subject in culture.
            
            Leonardo is among the greatest painters in the history of art and is often credited as the founder of the High Renaissance.[3] Despite having many lost works and less than 25 attributed major works—including numerous unfinished works—he created some of the most influential paintings in Western art.[3] His magnum opus, the Mona Lisa, is his best known work and often regarded as the world's most famous painting. The Last Supper is the most reproduced religious painting of all time and his Vitruvian Man drawing is also regarded as a cultural icon. In 2017, Salvator Mundi, attributed in whole or part to Leonardo,[5] was sold at auction for US$450.3 million, setting a new record for the most expensive painting ever sold at public auction.
        </div>
    </Drawer> -->
{:else}
    <Idle />
    <div class="flex flex-row w-full h-full">
        <Sidebar {locale} />
        <!-- Dashboard Pane -->
        <svelte:component this={tabs[$dashboardRoute]} {locale} on:next={routerNext} />
    </div>
{/if}
