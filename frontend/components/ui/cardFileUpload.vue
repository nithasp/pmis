<template>
    <div class="tablet:w-[310px] rounded-lg bg-gray-200 px-3 py-1 h-[38px] grid justify-between items-center grid-cols-[1fr_25px] gap-x-2">
       <p class="line-clamp-1 text-sm">{{ fileName }}</p>
       <UIcon name="i-heroicons-x-mark" class="w-5 h-5 cursor-pointer" @click="setDialog(true)" />
    </div>
 </template>
 <script setup>
 defineProps({
    width: String,
    fileName: String,
    setDialog: Function,
 });
 </script>
 