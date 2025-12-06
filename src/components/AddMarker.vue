<script setup lang="ts">
import { ref } from 'vue';

    const props = defineProps<{
        label: string,
        onOk: (newLabel: string) => void,
        onCancel: () => void

    }>()


    const labelText = ref(props.label)
</script>

<template>
    <div class="modal">
        <label>Add Marker</label>

        <input v-model="labelText" class="modal-input" />

        <div class="modal-buttons">
            <button @click="props.onOk(labelText)">Ok</button>
            <button @click="props.onCancel()">Cancel</button>
        </div>
    </div>
</template>