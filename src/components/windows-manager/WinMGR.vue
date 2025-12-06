<script setup lang="ts">
import { ref, computed } from 'vue';
import Window from './Window.vue';

const BASE_Z_INDEX = 100;

const windows = ref<WindowState[]>([])

const highestZIndex = computed(() => {
    return windows.value.reduce((maxZ, win) => Math.max(maxZ, win.zIndex), BASE_Z_INDEX)
})

const openWindow = (params: Partial<WindowState>) => {
    const id = params.id ?? `win-${Math.random().toString(36).slice(2)}`

    windows.value.push({
        id,
        title: params.title ?? 'New Window',
        x: params.x ?? 100,
        y: params.y ?? 100,
        width: params.width ?? 300,
        height: params.height ?? 200,
        zIndex: highestZIndex.value + 1,
        component: params.component,
        props: params.props
    })
}

const focusWindow = (id: string) => {
    const focusedWindow = windows.value.find(w => w.id === id)

    if (focusedWindow) {
        if (focusedWindow.zIndex !== highestZIndex.value)
        focusedWindow.zIndex = highestZIndex.value + 1
    }
}


const updatePosition = (id: string, x: number, y: number) => {
    const windowtoUpdate = windows.value.find(w => w.id === id)
    if (windowtoUpdate) {
        windowtoUpdate.x = x
        windowtoUpdate.y = y
    }
}

const closeWindow = (id: string) => {
    windows.value = windows.value.filter(win => win.id !== id)
}

interface WindowState {
    id: string
    title: string
    x: number
    y: number
    width: number
    height: number
    zIndex: number
    
    component: any
    props: any
}

defineExpose({
    openWindow,
    closeWindow,
    focusWindow
})
</script>


<template>
    <div class="win-mgr-desktop">
        <Window
            v-for="win in windows"
            :key="win.id"
            :id="win.id"
            :title="win.title"
            :x="win.x"
            :y="win.y"
            :width="win.width"
            :height="win.height"
            :z-index="win.zIndex"

            @update:position="([newX, newY]) => updatePosition(win.id, newX, newY)"
            @update:zindex="focusWindow($event)"
            @close="closeWindow"
            >
            <component :is="win.component" v-bind="win.props" />
        </Window>
    </div>
</template>