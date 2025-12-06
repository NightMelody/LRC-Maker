<script setup lang="ts">
// こんにちは！ I know the code is a little... messy, but I'm gonna fix it in the beta :D

import WaveSurfer from 'wavesurfer.js';
//import TimelinePlugin from 'wavesurfer.js/dist/plugins/timeline.js';
import ZoomPlugin from 'wavesurfer.js/dist/plugins/zoom.js';
import HoverPlugin from 'wavesurfer.js/dist/plugins/hover.js';
import { onBeforeUnmount, onMounted, ref, computed } from 'vue';
import WinMGR from './windows-manager/WinMGR.vue';
import Properties from './Properties.vue';
import AddMarker from './AddMarker.vue';

type Metadata = {
    ti?: string // Title
    ar?: string // Artist
    al?: string // Album
    au?: string // Author of lyrics
    by?: string // Author of LRC file
}

type LyricsLine = {
    time: number
    lyric: string
}

type ParsedLyrics = [Metadata, LyricsLine[]]
const lyricLines = ref<LyricsLine[]>([])

const containerRef = ref<HTMLElement | null>(null)
const waveSurfer = ref<WaveSurfer | null>(null)

const currentTime = ref(0)
const totalDuration = ref(0)
const isPlaying = ref(false)

const formattedcurrentTime = computed(() => formatTime(currentTime.value))
const formattedtotalDuration = computed(() => formatTime(totalDuration.value))

const undoStack = ref<any[]>([])
const redoStack = ref<any[]>([])

const winmgr = ref<InstanceType<typeof WinMGR> | null>(null)

const metadata = ref<Metadata>({
    ti: '',
    ar: '',
    al: '',
    au: '',
    by: ''
})
//const markers = ref<Marker[]>([])
const markers = ref<Array<{time: number, label: string}>>([])

const api = window.electronAPI



const labelText = ref<String>('')

const options = {
        "height": 350,
        "waveColor": '#4F4A85',
        "progressColor": '#383351',
        "barWidth": 3,
        "barGap": 2,
        "barRadius": 4,
        "responsive": true,
        "fillparent": true,
        
        //"url": '/NEVER - Neuro x Evil.ogg',

        "cursorWidth": 3,
        "cursorColor": '#00a2e8',
}

onMounted(() => {
    waveSurfer.value = WaveSurfer.create({
        container: containerRef.value!,
        ...options
    })

    const zoom = ZoomPlugin.create()

    waveSurfer.value?.registerPlugin(zoom)

    // const timeline = TimelinePlugin.create({
    //     container: '#timeline',
    //     insertPosition: 'beforebegin'
    // })

    waveSurfer.value?.registerPlugin(HoverPlugin.create())

    //waveSurfer.value?.registerPlugin(timeline)

    waveSurfer.value.on('zoom', () => {
        // I really don't know ho to fix this lmao
        //timeline.updateScroll()
    })



    waveSurfer.value?.on('audioprocess', (t) => {
        currentTime.value = t
    })

    waveSurfer.value?.on('ready', () => {
        totalDuration.value = waveSurfer.value!.getDuration()
    })

    waveSurfer.value?.on('play', () => isPlaying.value = true)
    waveSurfer.value?.on('pause', () => isPlaying.value = false)

    waveSurfer.value?.on('interaction', (t) => {
        currentTime.value =t
    })


    window.addEventListener('keydown', handleShortcuts)

})

onBeforeUnmount(() => {
    waveSurfer.value?.destroy()

    window.removeEventListener('keydown', handleShortcuts)
})


const formatTime = (seconds: number): string => {

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);

    const ms = Math.floor((seconds - Math.floor(seconds)) * 1000);

    const formattedMinutes = `0${minutes}`.slice(-2);
    const formattedSeconds = `0${remainingSeconds}`.slice(-2);
    const formattedMs = `00${ms}`.slice(-3);

    
    return `${formattedMinutes}:${formattedSeconds}.${formattedMs}`
}


// I think I can remove the old method?
const addMarker = (Label?: string) => {
    if (!Label) {
        // Old Method
        pushHistory()
        const markerLabel = labelText.value.trim() || 'Empty Line'
        const time = waveSurfer.value?.getCurrentTime() ?? 0

        const index = markers.value.findIndex(m => m.time > time)

        if (index === -1) {
            markers.value.push({time, label: markerLabel})
        } else {
            markers.value.splice(index, 0, {time, label: markerLabel})
        }

        labelText.value = ''
    } else {
        pushHistory()
        const markerLabel = (
            Label ?? labelText.value).trim() || 'Empty Line'

        const time = waveSurfer.value?.getCurrentTime() ?? 0

        const index = markers.value.findIndex(m => m.time > time)

        if (index === -1) {
            markers.value.push({time, label: markerLabel})
        } else {
            markers.value.splice(index, 0, {time, label: markerLabel})
        }
    }    
}

// If you will build the app, just comment these const
const goToMarker = (t:number) => {
    waveSurfer.value?.setTime(t)
}

const deleteMarker = (i: number) => {
    pushHistory()
    markers.value.splice(i,1)
}


const lirycsFilter = [
    {name: 'Lyrics File', extensions: ['lrc']}
]

const audioFilter = [
    {name: 'Audio File', extensions: ['mp3', 'ogg', 'wav', 'flac', 'opus', 'aac']}
]

async function openLyricsFile() {
    const filePaths = await api.openFile(lirycsFilter)

    if (!filePaths?.length) return

    const { success, content } = await api.readLyricsFile(filePaths[0])
    if(!success) return 

    const [meta, lines] = parseLrc(content)

    metadata.value = {
        ti: meta.ti ?? '',
        ar: meta.ar ?? '',
        al: meta.al ?? '',
        au: meta.au ?? '',
        by: meta.by ?? ''
    }
    lyricLines.value = lines

    markers.value = lines.map(line => ({
        time: line.time,
        label: line.lyric
    }))
}


async function openAudioFile() {
    const filePaths = await api.openFile(audioFilter)

    if (!filePaths || filePaths.length === 0) {
        return
    }

    const audioPath = filePaths[0]

    const result = await api.readAudioBuffer(audioPath)


    if (result.success) {
        const wavesurferInstance = waveSurfer.value
        const audioBlob = new Blob([result.buffer], {type: 'audio/mp3'})

        wavesurferInstance?.loadBlob(audioBlob)
        //= audioPath
    }
}

async function saveLyricsFile() {
    const filePath = await api.saveFile("lyrics.lrc", [
        { name: "Lyrics File", extensions: ["lrc"] }
    ])

    if (!filePath) return

    const lrcText = buildLrc()

    await api.saveLyricsFile(filePath, lrcText)
}


function parseLrc(lrcText: string): ParsedLyrics {
    const metadata: Metadata = {}
    const lyricLines: LyricsLine[] = []

    const lines = lrcText.replace(/\r/g, '').split('\n').filter(line => line.trim() !== '')

    const tagRegex = /^\[(ti|ar|al|au|by):(.*?)\]$/i
    const timeTagRegex = /\[\d{2}:\d{2}\.\d{2,3}\]/;

    for (const line of lines) {
        const trimmedLine = line.trim()

        const tagMatch = trimmedLine.match(tagRegex)
        if (tagMatch) {
            const key = tagMatch[1].toLowerCase() as keyof Metadata
            const value = tagMatch[2].trim()

            if (['ti', 'ar', 'al', 'au', 'by'].includes(key)) {
                metadata[key] = value;
            }

            continue
        }

        //const lineMatch = trimmedLine.match(lineRegex)
        if (timeTagRegex.test(trimmedLine)) {
            const timeMatches = trimmedLine.matchAll(/\[(\d{2}):(\d{2})\.(\d{2,3})\]/g);

            const lastBracketIndex = trimmedLine.lastIndexOf(']')
            const lyricText = trimmedLine.substring(lastBracketIndex + 1).trim();


            if (!lyricText) continue

            for (const match of timeMatches) {
                const minutes = parseInt(match[1], 10)
                const seconds = parseInt(match[2], 10)
                let ms = parseInt(match[3], 10)

                if (match[3].length === 2) {
                    ms *= 10
                }

                const totalSeconds = minutes * 60 + seconds + ms / 1000

                lyricLines.push({
                    time: totalSeconds,
                    lyric: lyricText
                })
            }
        }
    }


    lyricLines.sort((a, b) => a.time - b.time)
    return [metadata, lyricLines]
}

function buildLrc(): string {
    let out = ''

    for (const key in metadata.value) {
        const val = metadata.value[key as keyof Metadata];
        if (val && val.trim() !== "") {
            out += `[${key}:${val}]\n`;
        }
    }

    markers.value.forEach(m => {
        out += `[${formatTime(m.time)}]${m.label}\n`;
    });

    return out
}



const activeMarkerIndex = computed(() => {
    const t = currentTime.value
    let idx = -1

    for (let i = 0; i < markers.value.length; i++) {
        if (markers.value[i].time <= t) {
            idx = i
        } else {
            break
        }
    }
    return idx
})



function pushHistory() {
    undoStack.value.push({
        markers: JSON.parse(JSON.stringify(markers.value)),
        metadata: JSON.parse(JSON.stringify(metadata.value))
    })

    redoStack.value = []
}

function handleShortcuts(e: KeyboardEvent) {
    const target = e.target as HTMLElement

    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return
    }


    if (e.ctrlKey && e.key === 'z') {
        e.preventDefault()
        undo()
        return
    }

    if (e.ctrlKey && e.key === 'y') {
        e.preventDefault()
        redo()
        return
    }
}

function undo() {
    if (undoStack.value.length === 0) return

    const prev = undoStack.value.pop()

    redoStack.value.push({
        markers: JSON.parse(JSON.stringify(markers.value)),
        metadata: JSON.stringify(metadata.value)
    })

    markers.value = prev.markers
    metadata.value = prev.metadata
}

function redo() {
    if (redoStack.value.length === 0) return
    const next = redoStack.value.pop()

    undoStack.value.push({
        markers: JSON.parse(JSON.stringify(markers.value)),
        metadata: JSON.parse(JSON.stringify(metadata.value))
    })

    markers.value = next.markers
    metadata.value = next.metadata



}

function openAddModel () {
    winmgr.value?.openWindow({
        id: 'add-marker',
        title: 'Add Marker',
        x: 200,
        y: 100,
        width: 600,
        height: 200,
        component: AddMarker,
        props: {
            label: labelText.value,
            onOk: (value: string) => {
                addMarker(value)
            },
            onCancel: () => {
                winmgr.value?.closeWindow('add-marker')
            }
        }
    })
}

function openMetadata() {
    winmgr.value?.openWindow({
    id: 'metadata-editor',
    title: 'Edit Metadata',
    x: 450,
    y: 120,
    width: 600,
    height: 460,
    component: Properties,
    props: {
        metadata: metadata.value
    }
})}
</script>

<template>
    <WinMGR ref="winmgr" />
    <nav class="toolbar">
        <div class="menu-item">
            File
            <ul class="dropdown">
                <li><button @click="openLyricsFile">Open</button></li>
                <li><button @click="saveLyricsFile">Save</button></li>
                <li class="separator"></li>
                <li><button @click="openAudioFile">Load audio</button></li>
                <li><button @click="openMetadata">Properties</button></li>
                <!-- <li><button @click="stopApp">Exit</button></li> -->
            </ul>
        </div>

        <div class="menu-item">
            Edit
            <ul class="dropdown">
                <li><button @click="undo">Undo</button></li>
                <li><button @click="redo">Redo</button></li>
            </ul>
        </div>

        <div class="menu-item">
            Help
            <ul class="dropdown">
                <li><button>Help</button></li>
                <!-- <li><button>Redo</button></li> -->
            </ul>
        </div>
    </nav>


    <div class="main-layout">
        <div class="left-panel">
            <div class="write-line">
                <input type="text" v-model="labelText" placeholder="Write Line"></input>
                <button @click="addMarker()">Add Marker</button>
            </div>
        

            <div class='waveform'>
                <div class="container" ref="containerRef"></div>
            </div>

            <div class="controls">
                <button @click="waveSurfer?.playPause()">
                    {{ isPlaying ? 'Pause': 'Play' }}
                </button>

                <span>{{ formattedcurrentTime }} /  </span>
                <span>{{ formattedtotalDuration }}</span>
            </div>
        </div>

        <div class="right-panel">
            <div class="marker-header">
                <!-- @click="showAddModal" -->
                <button class="add-marker-btn" @click="openAddModel()">+</button>
            </div>

            <div class="marker-list">
                <div v-for="m,i in markers" :key="i" :class="{active: i === activeMarkerIndex}" class="marker-row" >
                    <input v-model="m.label" class="marker-input" />
                    <span class="marker-time">{{ formatTime(m.time) }}</span>
                </div>
            </div>
        </div>
    </div>

    <!-- Add Marker -->

    <!-- Metadata -->

</template>

<style lang="css">
/* Toolbar Layout */
.toolbar {
    display: flex;
    background-color: #2e2e2e;
    padding: 0;
    height: 28px;
    user-select: none;
    z-index: 1000;
    border-bottom: 1px solid #444;
    color: #eee;
}

.menu-item {
    position: relative;
    color: #f0f0f0;
    padding: 3px 12px; 
    cursor: default;
    transition: background-color 0.2s;
}

.menu-item:hover {
    background-color: #3a3a3a;
}

.dropdown {
    display: none;
    position: absolute;
    top: 46%;
    left: 0;
    padding: 0;
    background: #3a3a3a;
    border: 1px solid #555;
    min-width: 100px;
    list-style: none;
    z-index: 100;
}

.menu-item:hover > .dropdown {
    display: block;
}

.dropdown li button {
    width: 100%;
    padding: 6px 12px;
    background: none;
    border: none;
    color: #fff;
    text-align: left;
}

.dropdown li button:hover {
    background: #555;
}

/* Separador */
.dropdown .separator {
    height: 1px;
    background-color: #555;
    margin: 5px 0;
}

/* Main Layout */
.main-layout {
    display: flex;
    height: calc(100vh - 30px);
}


.left-panel {
    flex: 1;
    padding: 20px;
}

.write-line {
    display: flex;
    gap: 30px;
}

.write-line input {
    flex: 1;
    padding: 8px;
    background: #2e2e2e;
    border: 1px solid #555;
    color: #FFF;
    min-width: 1px;
}

.write-line button {
    padding: 6px 14px;
    background: #2e2e2e;
    color: white;
    border: 1px solid #222;
}

.waveform {
    margin-top: 48px;
    height: 350px;
    background: #0001;
    border: 1px solid #444;
    max-width: 95vw;
}

.controls {
    margin-top: 22px;
    display: flex;
    gap: 4px;
    align-items: center;
}

.controls button {
    padding: 6px 14px;
    background: #2e2e2e;
    color: white;
    border: 1px solid #222;
}

.right-panel {
    width: 350px;
    background: #3a3a3a;
    border-left: 1px solid #444;
    display: flex;
    flex-direction: column;
}

.marker-header {
    padding: 10px;
    display: flex;
    justify-content: flex-start;
}

.add-marker-btn {
    background: #2e2e2e;
    border: 1px solid #222;
    color: white;
    padding: 6px 10px;
    border-radius: 4px;
}

.marker-list {
    overflow-y: auto;
    padding: 10px;
}

.marker-row {
    display: flex;
    justify-content: space-between;
    background: #2e2e2e;
    padding: 6px;
    margin-bottom: 8px;
    border-radius: 4px;
}

.marker-input {
    width: 65%;
    background: #2e2e2e;
    border: 0px solid #555;
    color: white;
    padding: 4px;
}

.marker-time {
    color: #fff;
    font-size: 14px;
}

/* Window */
.window-content {
    background: #2e2e2e;
    padding: 10px;
    height: 100%;
    box-sizing: border-box;
}

/* Metadata */
.metadata-window {
    color: #FFF;
    
}
</style>