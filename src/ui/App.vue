<template>
  <div id="app">
    <RewardPage />
  </div>
</template>

<script>
import RewardPage from './views/RewardPage.vue';

export default {
  name: 'App',
  components: {
    RewardPage
  }
};
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  -webkit-font-smoothing: antialiased;
  background: #f5f6fa;
}
</style>
