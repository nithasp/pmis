<template>
   <header class="h-[98px] flex justify-between items-center px-8">
      <div class="flex items-center gap-x-9">
         <img :src="Logo" alt="logo" class="w-[198px]" />
         <div class="hidden lg:block">
            <h2>ชื่อ</h2>
         </div>
      </div>
      <UDropdown :items="items" :popper="{ placement: 'bottom-start' }" :ui="{
         ring: 'ring-gray-50',
         divide: 'divide-gray-100',
         item: {
            active: 'bg-gray-50',
         },
      }" class="sm:hidden">
         <template #item="{ item }">
            <LogoutIcon v-if="item.id == 'logout'" />
            <span class="truncate">{{ item.label }}</span>
         </template>
         <div class="rounded-full sm:bg-[#6F4A9E] h-[46px] cursor-pointer">
            <div class="flex items-center gap-x-3">
               <img :src="Avatar" alt="Avatar User" width="46" height="46" />
               <div class="hidden sm:block bg-[#6F4A9E] rounded-full min-w-[160px]">
                  <p class="font-sarabun-bold leading-5 text-sm">{{ store.profileUser.firstname }} {{
                     store.profileUser.lastname
                  }}</p>
                  <p class="leading-5 text-sm">{{ store.profileUser.email }}</p>
               </div>
            </div>
         </div>
      </UDropdown>
      <div class="rounded-full sm:bg-[#6F4A9E] h-[46px] pe-2 hidden sm:block">
         <div class="flex items-center gap-x-3">
            <img :src="Avatar" alt="Avatar User" width="46" height="46" />
            <div class="hidden sm:block bg-[#6F4A9E] rounded-full">
               <p class="font-sarabun-bold leading-5 text-xs">{{ store.profileUser.firstname }} {{
                  store.profileUser.lastname
               }}</p>
               <p class="leading-5 text-xs">{{ store.profileUser.email }}</p>
            </div>
            <div class="flex rounded-[60px] p-2 bg-white gap-x-2 cursor-pointer" @click="setDialog(true)">
               <LogoutIcon />
               <p class="text-xs">ออกจากระบบ</p>
            </div>
         </div>
      </div>
   </header>
   <DialogConfirm :isOpen="isOpen" :setDialog="setDialog" title="ออกจากระบบ" desc="คุณต้องการออกจากระบบใช่หรือไม่"
      icon="warning" :btnAction="fnLogout" />
   <Loading v-if="isLoading" />
</template>

<script setup>
import Logo from "~/assets/images/logo.png";
import Avatar from "~/assets/images/header/avatar.png";
import DialogConfirm from "~/components/dialog/confirm";
import LogoutIcon from "~/assets/icons/logout";
import Loading from "~/components/loading";
const authStore = useAuthStore()

const items = [
   [
      {
         id: "logout",
         label: "ออกจากระบบ",
         icon: "i-heroicons-arrow-left-start-on-rectangle",
         click: () => {
            setDialog(true);
         },
      },
   ],
];

const isLoading = ref(false);
const fnLogout = async () => {
   isLoading.value = true;
   try {
      await authStore.logoutUser()
      navigateTo('/login')
   } catch (error) {
      console.error('Login error:', error)
   } finally {
      isLoading.value = false
      setDialog(false)
   }
};

const isOpen = ref(false);
const setDialog = (status) => {
   isOpen.value = status;
};

</script>
