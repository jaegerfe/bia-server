<template>
  <footer>
    <br>
    <br>
    <hr>
    <div class="container">
      <p class="text-muted offset-sm-2">
        <!-- <img src="../../../img/theme/logo-footer.png" alt style="position: relative; top: -1px;"> -->
        &copy; {{ window.app_full_name }}
        <br>Todos os direitos reservados.
        <br>
        <a :href="window.app_website" target="_poweredby">{{ window.app_website }}</a>
        <br>
        <span>v.{{ git_v }}</span>
      </p>
    </div>
    <br>
    <br>
  </footer>
</template>

<script>
export default {
  data() {
    return {
      git_v: window.app_gitv,
      window: window
    };
  }
};
</script>

<style scoped>
</style>
