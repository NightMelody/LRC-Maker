<script setup lang="ts">
import { computed, onUnmounted } from 'vue';

const props = defineProps<{
    id: string;
    title: string;
    x: number;
    y: number;
    width: number;
    height: number;
    zIndex: number;
}>()

const emit = defineEmits<{
    (e: 'update:position', payload: [number, number]): void
    (e: 'update:zindex', id: string): void
    (e: 'close', id: string): void
}>()

const windowStyle = computed(() => ({
    left: `${props.x}px`,
    top: `${props.y}px`,
    width: `${props.width}px`,
    height: `${props.height}px`,
    zIndex: props.zIndex,
    position: 'absolute' as const,
}));



let isDragging = false
let dragOffsetX = 0
let dragOffsetY = 0

const startDrag = (event: MouseEvent) => {
    event.preventDefault()

    dragOffsetX = event.clientX - props.x
    dragOffsetY = event.clientY - props.y
    isDragging = true

    document.addEventListener('mousemove', onDrag)
    document.addEventListener('mouseup', stopDrag)

    focusWindow()
}

const onDrag = (event: MouseEvent) => {
    if (!isDragging) return

    const newX = event.clientX - dragOffsetX
    const newY = event.clientY - dragOffsetY

    emit('update:position', [newX, newY])
}

const stopDrag = () => {
    isDragging = false
    document.removeEventListener('mousemove', onDrag)
    document.removeEventListener('mouseup', stopDrag)
}

onUnmounted(() => {
    document.removeEventListener('mousemove', onDrag)
    document.removeEventListener('mouseup', stopDrag)
})

const focusWindow = () => {
    emit('update:zindex', props.id)
}

const closeWindow = () => {
    emit('close', props.id)
}
</script>

<template>
    <div class="window" :style="windowStyle" @mousedown="focusWindow">
        <div class="window-header" @mousedown.stop="startDrag">
            <span class="window-title">{{ title }}</span>

            <div class="window-control">
                <button class="close-btn" @click.stop="closeWindow">X</button>
            </div>
        </div>

        <div class="window-content">
            <slot></slot>
        </div>
    </div>
</template>


<style scoped lang="css">
.window {
    position: absolute;
    background: #f0f0f0;
    border: 1px solid #333;
    box-shadow: 2px 2px 10px rgba(0, 0, 0, 0.5);
    display: flex;
    flex-direction: column;
    
    transition: z-index 0.1s;
}

.window-header {
    cursor: default;
    background: #0078d4;
    color: white;
    padding: 5px 10px;
    user-select: none;

    display: flex;
    justify-content: space-between;
    align-items: center;
}

.window-content {
  flex-grow: 1;
  padding: 10px;
  overflow: auto;
}

.window-title {
    flex-grow: 1;
}

.close-btn {
    background: red;
    color: white;
    border: none;
    padding: 2px 8px;
    margin-left: 10px;
    cursor: default;
    font-weight: bold;
    border-radius: 2px;
}

.close-btn:hover {
  background: darkred;
}
</style>