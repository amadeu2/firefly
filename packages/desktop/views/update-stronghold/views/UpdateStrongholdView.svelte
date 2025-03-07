<script lang="ts">
    import { OnboardingLayout } from '@components'
    import { migrateStrongholdFromOnboardingProfile } from '@contexts/onboarding/actions'
    import { localize } from '@core/i18n'
    import { migrateStrongholdFromActiveProfile } from '@core/profile/actions/active-profile'
    import { isValidJson } from '@core/utils'
    import { Animation, Button, PasswordInput, Text } from '@ui'
    import { HTMLButtonType, TextType } from '@ui/enums'
    import { updateStrongholdRouter } from '../update-stronghold-router'

    export let password: string = ''
    export let isRecovery: boolean = false

    let passwordError: string = ''
    let isBusy = false

    async function onSubmit(): Promise<void> {
        try {
            isBusy = true
            if (isRecovery) {
                await migrateStrongholdFromOnboardingProfile(password)
            } else {
                await migrateStrongholdFromActiveProfile(password)
            }
            isBusy = false
            $updateStrongholdRouter.next()
        } catch (err) {
            isBusy = false
            const message = err?.message ?? ''
            const parsedError = isValidJson(message) ? JSON.parse(message) : ''
            passwordError = parsedError?.payload?.error.replaceAll('`', '') ?? localize(message)
            return
        }
    }

    function onBackClick(): void {
        $updateStrongholdRouter.previous()
    }
</script>

<OnboardingLayout {onBackClick}>
    <div slot="title">
        <Text type={TextType.h2}>
            {localize('views.updateStronghold.update.title')}
        </Text>
    </div>
    <div slot="leftpane__content">
        <Text secondary classes="mb-12">
            {localize(`views.updateStronghold.update.${isRecovery ? 'recoveryBody' : 'loginBody'}`)}
        </Text>
        <form on:submit|preventDefault={onSubmit} id="update-stronghold-form">
            <PasswordInput bind:value={password} bind:error={passwordError} autofocus showRevealToggle />
        </form>
    </div>
    <div slot="leftpane__action">
        <Button
            type={HTMLButtonType.Submit}
            form="update-stronghold-form"
            classes="w-full"
            disabled={isBusy || !password || !!passwordError}
            {isBusy}
        >
            {localize('actions.updateAndContinue')}
        </Button>
    </div>
    <div slot="rightpane" class="w-full h-full flex justify-center bg-pastel-blue dark:bg-gray-900">
        <Animation classes="setup-anim-aspect-ratio" animation="import-from-file-password-desktop" />
    </div>
</OnboardingLayout>
