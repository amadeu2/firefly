<script>
	import { onMount, createEventDispatcher } from 'svelte'
	import { spring, tweened } from 'svelte/motion'
	import * as eases from 'svelte/easing'
	
	export let config = {amount: 1, id: 1, height: 1, marginTop: 160}
	export let isiOS = false
	export let delayIn = 0
	export let opened = false
	const dispatch = createEventDispatcher();

    const sleep = ms => new Promise(r => setTimeout(r, ms))
    const is_keyboard = false // Android resize on keyboard

	let _heightSvg = 0
	let _widthSvg = 0
	
    const pullY_ratio = 1.001
	let coords = { x: 0, y: 0, pullY: 0 }
	let unsubscribe
	let coordsSpring
	let coordsTweened

	let is_running = false
	
	// workaround android keyboard behavior
	let inBottom = false
	let isOpen = false
	const ios_margin = 0
	const margin_bottom = -23
	
	onMount(async () => {
		_heightSvg = window.innerHeight - config.height
		_widthSvg = window.innerWidth
		config.width = _widthSvg / config.amount
		config.x = 0

		if (opened) {
			delayIn = 0
			await sleep(1600)
			open()
			//fast_open();
		}
	});

	function slide(node, callback) {
		function handleTouchStart(event) {
			// When come from a no cancelable event, like scroll, to prevent slide also
			if (!event.cancelable) return

			event.preventDefault()
			event.stopPropagation()
			event.stopImmediatePropagation()

			const
				startY = event.touches[0].pageY,
				positionQueue = [0, 0, startY],
				timeQueue = [0, 0, window.performance.now()] // for calc velocity later

			if (event.targetTouches.length === 1) {
				callback({
					_pullX: event.touches[0].pageX,
					_pullY: event.touches[0].pageY,
					_startY: startY })
			}

			function handleTouchMove(event) {
				positionQueue.push(event.touches[0].pageY)
				timeQueue.push(window.performance.now())
				positionQueue.shift()
				timeQueue.shift() //console.log(positionQueue)

				if (event.targetTouches.length === 1) {
					callback({
						_pullX: event.touches[0].pageX,
						_pullY: event.touches[0].pageY,
						_startY: startY })
				}
			}

			function handleTouchEnd() {
				callback({
					_pullX: 0,
					//_pullY: 0,
					_startY: positionQueue[0],
					_endY: positionQueue[positionQueue.length - 1],
					_initTime: timeQueue[0],
					_endTime: timeQueue[timeQueue.length - 1] })

				node.removeEventListener('touchmove', handleTouchMove, false)
				node.removeEventListener('touchend', handleTouchEnd, false)
			}

			node.addEventListener('touchmove', handleTouchMove, false)
			node.addEventListener('touchend', handleTouchEnd, false)
		}

		node.addEventListener('touchstart', handleTouchStart, false)

		return {
			destroy: () => {
				node.removeEventListener('touchstart', handleTouchStart, false)
			},
		};
	}

	function slideIt(e) {
		//if (is_running) return; // Block upto finish sliding
		function end_animation({ y, pullY, corners }) {
			//if (!coordsSpring) return
			//unsubscribe = coordsSpring.subscribe(c => coords = c)
			return coordsSpring && coordsSpring.set({
				x: _widthSvg / 2,
				y,
				pullY
			}, { hard: true }).then(async () => {
				isOpen = true
				inBottom = false
				//unsubscribe()
				//await tick();
				is_running = false
			})
		}
		if (is_running) {
			return end_animation({ // set values for rewind or forward final transition
				y: config.height + config.marginTop,
				pullY: -_heightSvg/pullY_ratio + config.marginTop //(pullY_ratio + stiffness/80),
			})
		}

		if (e._pullX !== 0) { //drag
			coords.pullY = isOpen ? e._pullY - _heightSvg - e._startY + config.marginTop
				: e._pullY 
					? e._pullY - e._startY + ios_margin + margin_bottom 
					: 0 // chatbox margin bottom
			
			coords.x = e._pullX || coords.x
			coords.y = _heightSvg + config.height + coords.pullY * pullY_ratio

			if (!inBottom) inBottom = true

		} else { //intent to open
			opening: {
				is_running = true
				// Calc slide gesture velocity between events, ref: https://github.com/xcoderzach/touch-velocity
				const distance = e._endY - e._startY
				const time = (e._endTime - e._initTime) / 1000
				const velocity = Math.round(distance / time) || 0
				const slideVelocity = velocity < -8000 ? -8000 : velocity // Limit velocity to adapt context

				//console.log(slideVelocity)
				// break opening, why?
				if (slideVelocity > -80) break opening;
				
				if (-_heightSvg / 2 > coords.pullY || slideVelocity < -80) {

					const stiffness = slideVelocity > 0 ? 0.14 : 0.14 - slideVelocity / 28000 // Apply velocity to spring

					coordsSpring = spring({
						x: coords.x,
						y: coords.y,
						pullY: coords.pullY - stiffness * 500
					}, { stiffness, damping: 0.89 })

					// set values for rewind or forward final transition
					const y = config.height + config.marginTop
					const pullY = -_heightSvg / pullY_ratio + config.marginTop //(pullY_ratio + stiffness/80);

					unsubscribe = coordsSpring.subscribe(c => coords = c)
					return coordsSpring.set({
						x: _widthSvg / 2,
						y,
						pullY, // (pullY_ratio + stiffness/60),
					}, { soft: 0.01 })
						.then(() => {
							isOpen = true
							inBottom = false
							is_running = false
							unsubscribe()
							//dispatch('open', true);
						})
				}
			}
			// For open to complete tap/click event, and initial open
			if (!isOpen && coords.pullY >= -40) return open()
			if (isOpen) return close()

			coordsTweened = tweened({ //decided no open, curtains down!
				x: coords.x,
				y: coords.y,
				pullY: coords.pullY
			}, { duration: 350, easing: eases.quintOut })
			unsubscribe = coordsTweened.subscribe(c => coords = c)
			coordsTweened.set({
				x: _widthSvg /2,
				y: _heightSvg + config.height + ios_margin + margin_bottom,
				pullY: margin_bottom
			}).then(() => {
				coords.pullY = 0
				unsubscribe()
				isOpen = inBottom = is_running = false
			})
		}
	}

	export async function close() {
		console.log({is_running})
		// if (is_running) return
		is_running = true
		coordsTweened = tweened({ //decided no open, curtains down!
			x: coords.x,
			y: coords.y, // if we change y by above code, when closes reset position to end
			pullY: coords.pullY
		}, { duration: 200, easing: eases.quintOut })
		unsubscribe = coordsTweened.subscribe(c => coords = c)
		await coordsTweened.set({
			x: _widthSvg /2,
			y: _heightSvg + config.height + ios_margin + margin_bottom, // chatbox margin bottom
			pullY: 0
		})
		unsubscribe()
		is_running = isOpen = inBottom = false
		dispatch('close');
		
	}

	export async function fast_open() {
		isOpen = true
		inBottom = false
		
		coordsSpring = spring({
			x: coords.x,
			y: coords.y,
			pullY: coords.pullY
		}, { stiffness: 0, damping: 0 })
		unsubscribe = coordsSpring.subscribe(c => coords = c)

		await coordsSpring.set({
			x: _widthSvg / 2,
			y: config.height + config.marginTop,
			pullY: -_heightSvg/pullY_ratio + config.marginTop
		}, { soft: 0.01, hard: true })

		unsubscribe()
	}

	export async function open() {
		is_running = true

		const coords_spring = spring({
			y: _heightSvg,
			pullY: -_heightSvg / 2
		}, { stiffness: 0.18, damping: 0.999 })
		const unsubscribe_s = coords_spring.subscribe(c => coords = c)

		await coords_spring.set({
			y: config.height + config.marginTop,
			pullY: -_heightSvg / pullY_ratio + config.marginTop
		})
		unsubscribe_s()

		isOpen = true
		inBottom = false
		is_running = false
		//cont.parentNode.querySelector('#content').scrollTo(150,150)
	}

	$: opacity_dim = -coords.pullY / 650 * 0.55
	$: opacity = -coords.pullY / 100
		
</script>

<style>
	drawer {
        width: var(--w);
        position: absolute;
        top: var(--t);
        bottom: 0;
        height: 100%;
        z-index: 21;
        opacity: 1;
        user-select: none;
    }
	
    content {
        position: fixed;
		will-change: transform;
		transform: translate(0, var(--y));
        /* overflow-y: auto;
        -webkit-overflow-scrolling: touch; */
		border-radius: 1.5rem 1.5rem 0 0;
		/* margin-top: 2rem; */
        min-height: 100%;
        width: 100%;
		/* z-index: 8; */
		/* display: var(--display); */
        opacity: var(--opacity);
        /* pointer-events: auto; */
    }
	
	content:after {
		display: var(--display);
		position: fixed;
		top: var(--top);
		bottom: var(--bottom);
        content: "";
        /* margin-top: var(--mtop); */
        height: 40px;
        width: 100%;
        /* display: block; */
        background: var(--bg);
		/* background: linear-gradient(var(--direction), var(--color-sheet), rgba(255,255,255,0)); */
    }

	.invisible {
		display: none;
	}

</style>

<drawer
	style="--w: {inBottom? '100%' : '1%'}; --t: {!isiOS && is_keyboard && -74}px"
>
	<drag-area 
		class:invisible={!coords.pullY} 
		class="fixed h-full w-full" 
		use:slide="{slideIt}"
	>
		<!-- dim -->
		<div 
			class:invisible={!coords.pullY} 
			style="background-color: rgba(0,0,0,{opacity_dim}); height: 100vh"
		></div>
	</drag-area>
	
    <content
		class:invisible={!coords.pullY}
		class="bg-white dark:bg-gray-800"
        style="--y: {coords.pullY ? coords.y : -_heightSvg * 1.5}px;
			   --mtop: {-_heightSvg + config.height + ios_margin + config.marginTop - 2}px;
			   --top: 0;
               --direction: 'to bottom';
			   --opacity: {opacity};
			   --bg: {'linear-gradient(var(--direction), rgba(255,255,255,0.5), rgba(255,255,255,0))'
		}"
    >
        <slot></slot>
    </content>


</drawer>
