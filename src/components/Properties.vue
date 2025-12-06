<script setup lang="ts">
const props = defineProps({
    metadata: {
        type: Object,
        required: true
    }
})
</script>

<template>
    <div class="metadata-window">
        <h3>Edit Metadata</h3>

        <label>Title</label>
        <input v-model="metadata.ti" class="modal-input" />

        <label>Artist</label>
        <input v-model="metadata.ar" class="modal-input" />

        <label>Album</label>
        <input v-model="metadata.al" class="modal-input" />

        <label>Author</label>
        <input v-model="metadata.au" class="modal-input" />

        <label>By</label>
        <input v-model="metadata.by" class="modal-input" />
    </div>
</template>