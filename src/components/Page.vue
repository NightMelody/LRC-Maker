<script setup lang="ts">
import WaveSurfer from 'wavesurfer.js';
//import TimelinePlugin from 'wavesurfer.js/dist/plugins/timeline.js';
import ZoomPlugin from 'wavesurfer.js/dist/plugins/zoom.js';
import HoverPlugin from 'wavesurfer.js/dist/plugins/hover.js';
import { onBeforeUnmount, onMounted, ref, computed } from 'vue';

type Metadata = {
    ti?: string // Title
    ar?: string // Artist
    al?: string // Album
    au?: string // Author of lyrics
    by?: string // Author of LRC file
}

type LyricsLine = {
    time: number //ms
    lyric: string // I need to explain?
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
        "height": 128,
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
        // I really don't feel like fixing this
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
})

onBeforeUnmount(() => {
    waveSurfer.value?.destroy()
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

const addMarker = () => {
    const markerLabel = labelText.value.trim() || 'Empty Line'
    const time = waveSurfer.value?.getCurrentTime() ?? 0

    const index = markers.value.findIndex(m => m.time > time)

    if (index === -1) {
        markers.value.push({time, label: markerLabel})
    } else {
        markers.value.splice(index, 0, {time, label: markerLabel})
    }

    labelText.value = ''
}

const goToMarker = (t:number) => {
    waveSurfer.value?.setTime(t)
}

const deleteMarker = (i: number) => {
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
</script>

<template>
    <nav class="toolbar">
        <div class="menu-item">
            File
            <ul class="dropdown">
                <li><button @click="openLyricsFile">Open</button></li>
                <li><button @click="saveLyricsFile">Save</button></li>
                <li class="separator"></li>
                <li><button @click="openAudioFile">Load audio</button></li>
                <!-- <li><button>Properties</button></li> -->
                <!-- <li><button @click="stopApp">Exit</button></li> -->
            </ul>
        </div>

        <div class="menu-item">
            Edit
            <ul class="dropdown">
                <li><button>Undo</button></li>
                <li><button>Redo</button></li>
            </ul>
        </div>

        <div class="menu-item">
            View
            <ul class="dropdown">
                <li><button>Waveform</button></li>
                <li><button>Redo</button></li>
            </ul>
        </div>
    </nav>

    <div>
        <div class="wave-wrapper">
            <div class="container" ref="containerRef"></div>
            <!-- <div id="timeline"></div>  Disabled cuz i don't want to fix it now-->
        </div>
        
        <div>
            <button @click="waveSurfer?.playPause()">
                {{ isPlaying ? 'Pause': 'Play' }}
            </button>
            <button @click="addMarker">Add Marker</button>
        </div>
        <div>
            <p>Current Time: {{ formattedcurrentTime }}</p>
            <p>Duration: {{ formattedtotalDuration }}</p>
        </div>
    </div>

    <div class="container2">
        <h3>Time Markers</h3>

        <div v-for="m,i in markers" :key="i" class="marker-item">
            <div class="marker-info">
                <strong class="marker-label">{{ m.label }}</strong>
                <div class="marker-time">{{ formatTime(m.time) }}</div>
            </div>

            <button class="btn goto-btn" @click.stop="goToMarker(m.time)">Go to</button>
            
            
            <button class="del-btn" @click.stop="deleteMarker(i)">Del</button>
        </div>
    </div>



    <div class="container3">
        <h3>Write Line</h3>

        <input type="text" style="font-size: 32px;" placeholder="Write Text" v-model="labelText"></input>
    </div>

    <!-- This -->
    <div class="container4">
        <h3>Metadata</h3>

        <h5>Title</h5>
        <input v-model="metadata.ti"></input>

        <h5>Artist</h5>
        <input v-model="metadata.ar"></input>

        <h5>Album</h5>
        <input v-model="metadata.al"></input>

        <h5>Author</h5>
        <input v-model="metadata.au"></input>

        <h5>By</h5>
        <input v-model="metadata.by"></input>
    </div>
</template>

<style lang="css">
.toolbar {
    display: flex;
    background-color: #2e2e2e;
    padding: 0;
    margin: 0;
    user-select: none;
    position: absolute;
    top: 0;
    left: 0;
    z-index: 1000;
    border-bottom: 1px solid #444;

    width: 100%;
}

.menu-item {
    position: relative;
    color: #f0f0f0;
    padding: 0px 12px; 
    cursor: default;
    transition: background-color 0.2s;
}

.menu-item:hover {
    background-color: #3a3a3a;
}

.dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    list-style: none;
    padding: 5px 0;
    margin: 0;
    background-color: #3e3e3e;
    border: 1px solid #555;
    min-width: 150px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.4);
    display: none;
}

.menu-item:hover > .dropdown {
    display: block;
}

.dropdown li {
    padding: 0;
}

.dropdown li button {
    width: 100%;
    text-align: left;
    background: none;
    border: none;
    color: #f0f0f0;
    padding: 6px 15px;
    cursor: pointer;
    white-space: nowrap;
}

.dropdown li button:hover {
    background-color: #4F4A85;
}

/* Separador */
.dropdown .separator {
    height: 1px;
    background-color: #555;
    margin: 5px 0;
}


.wave-wrapper {
    width: 1000px;
    position: relative;
    left: -250px;
    top: 350px;
}


.container {
    width: 100%;
}

.container2 {
    position: absolute;
    left:1020px;
    top: 500px;
    background-color: gray;
    max-height: 35vh;
    height: 35vh;
    width: 500px;

    overflow-y: auto;
    overflow-x: hidden;
}

.container3 {
    position: absolute;
    left: 20px;
    top: 100px;
}

.container4 {
    position: absolute;
    left: 1200px;
    top: 10px;
}

.marker-item {
    display: flex;

    align-items: center;

    justify-content: space-between;
    padding: 10px; 
    margin-bottom: 8px;
    border-radius: 6px; 
    background: #333;
}

.marker-label {
    display: flex;
    align-items: center;
    padding: 0px;
    font-size: larger;
}

.marker-time {
    font-size: medium;
}

.marker-info {
    display: flex;

    flex-direction: column;

    align-items: flex-start;

    flex-grow: 1;

    margin-right: 15px;
}

.del-btn {
    background: red;
    border-color: black;
}
</style>