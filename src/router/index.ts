import { createRouter, createWebHashHistory } from "vue-router";
import Home from '../components/Page.vue'
import Properties from "../components/Properties.vue";

const routes = [
    {path: '/', component: Home},
    {path: '/properties', component: Properties}
]

export default createRouter({
    history: createWebHashHistory(),
    routes
})