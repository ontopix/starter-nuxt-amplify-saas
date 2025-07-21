<script setup lang="ts">
definePageMeta({
  layout: 'auth'
})

useSeoMeta({
  title: 'Login'
})

const state = ref('signin')
const onStateChange = (newState: string) => {
  state.value = newState
}

const onSignedIn = () => {
  navigateTo('/')
}
</script>

<template>
  <Authenticator
    :state="state"
    @state-change="onStateChange"
    @signed-in="onSignedIn"
  />
</template>
