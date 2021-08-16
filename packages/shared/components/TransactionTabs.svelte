<!--@component TransactionTabs, handle transactions filtered by tabs.
	@param list - array of objects to filter / show.
    @param {number} selected - Default 0, selected tab array index.
-->
<script lang="typescript">
    import { Text, Button } from 'shared/components'
    import { fly } from 'svelte/transition';
    import * as easing from 'svelte/easing';
	import { flip } from 'svelte/animate';

    export let list = []
    export let selected = 0
    export let locale
    
    const tabs = ['All', 'Incoming', 'Outgoing']
    let current = tabs[selected]
    
    const filterBy = item => item.payload?.data?.essence?.data?.incoming
    
    $: filtered = list.filter(item => current === 'All' 
        || current === 'Incoming' && filterBy(item)
        || current === 'Outgoing' && !filterBy(item)
    )

</script>

<style type="text/scss">
    ul { 
        --offset: 1px;
		--button-count: 3;
		--button-width: max(23vw, calc(65vw / var(--button-count)));
        --button-height: 30px;
        border-width: calc(var(--offset) * var(--button-count));
        border-color: rgba(0,0,0,0);
        border-style: solid;
        // box-sizing: content-box;
	}
    
    // ul li#tab1.selected ~ #check-square { left: 0 }
    // ul li#tab2.selected ~ #check-square { left: var(--button-width) }
    // ul li#tab3.selected ~ #check-square { left: calc(var(--button-width) * 2) }
    $tabs: (1, 2, 3);
    @each $tab in $tabs {
        ul li#tab#{$tab}.selected ~ #check-square { 
            left: calc(var(--button-width) * #{$tab - 1});
        }
    }

    #check-square { 
        width: var(--button-width);
		height: var(--button-height);
        transition: left 0.5s cubic-bezier(0, 0.50, 0, 1.15);
		will-change: left;
	}
    button {
        width: var(--button-width);
        height: var(--button-height);
        -webkit-tap-highlight-color: rgba(0,0,0,0);
        user-select: none;
        -webkit-user-select: none;
    }
</style>

<nav class="w-full flex flex-row justify-between items-center mb-5">
    <ul class="relative flex rounded-lg items-center p-0 bg-gray-50 dark:bg-gray-900">
        {#each tabs as tab, i}
            <li id="tab{i + 1}" class:selected={current === tab} class="z-10 relative">    
                <button on:click={() => current = tab}>
                    <Text 
                        bold={current === tab} 
                        highlighted={current === tab} 
                        secondary={current !== tab}>{locale(tab)}</Text>
                </button>
            </li>
        {/each}
        <span id="check-square" class="absolute z-0 rounded-md bg-white dark:bg-gray-800"></span>
    </ul>
    <Button mobile onlyIcon icon="search"/>
</nav>

<main class="overflow-y-auto h-full space-y-2.5 -mr-2 pr-2 scroll-secondary">
    {#if filtered.length > 0}
    {#each filtered as item (item.id)}
        <div
            in:fly="{{ y: 40, duration: 357, easing: easing.quadIn }}" 
            animate:flip="{{ duration: 757 }}">
            
            <slot item={item} />
        
        </div>
    {/each}
    {:else}
        <slot />
    {/if}
</main>