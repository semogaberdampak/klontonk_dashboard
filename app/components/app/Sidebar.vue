<script setup lang="ts">
import { APP_VERSION } from '~/config'

const route = useRoute()
const connection = useConnection()
</script>

<template>
  <aside class="sidebar">
    <div class="sidebar-brand">
      <div class="brand-logo">K</div>
      <div class="brand-text"><strong>Klontonk</strong><span>Dashboard</span></div>
    </div>
    <nav class="nav" aria-label="Navigasi utama">
      <div v-for="group in NAV_GROUPS" :key="group.name" style="display: contents">
        <p class="nav-group">{{ group.name }}</p>
        <button
          v-for="item in group.routes"
          :key="item.path"
          type="button"
          :class="['nav-item', { active: route.path === item.path }]"
          :aria-current="route.path === item.path ? 'page' : undefined"
          @click="navigateTo(item.path)"
        >
          <span>{{ item.label }}</span>
        </button>
      </div>
    </nav>
    <div class="sidebar-foot">
      <div class="conn" :data-state="connection.state"><span class="dot" /><span>{{ connection.text }}</span></div>
      <p class="ver">v{{ APP_VERSION }} &#183; multi-tenant</p>
    </div>
  </aside>
</template>
