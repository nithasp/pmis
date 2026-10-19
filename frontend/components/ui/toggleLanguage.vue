<template>
   <!-- Collapsed sidebar: a single pill that shows the active language and switches to the other one -->
   <UTooltip v-if="compact" :text="switchLabel" :popper="{ placement: 'right', arrow: true, offsetDistance: 20 }"
      :ui="tooltipUi">
      <button type="button" :aria-label="switchLabel" @click="setLocale(nextOption.code)"
         class="flex h-8 w-[38px] items-center justify-center rounded-full bg-[#E3D4F6] font-anuphan-semi-bold text-xs text-primaryy-500 transition-colors hover:bg-[#D8C7EE] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primaryy-500/40 focus-visible:ring-offset-2">
         {{ activeOption.code.toUpperCase() }}
      </button>
   </UTooltip>

   <!-- Segmented control: the filled segment is the active language -->
   <div v-else role="group" :aria-label="$t('language')"
      :class="['relative inline-grid select-none grid-cols-2 rounded-full p-[3px]', styles.track]">
      <span aria-hidden="true" :class="[
         'absolute bottom-[3px] left-[3px] top-[3px] w-[calc(50%_-_3px)] rounded-full bg-primaryy-500 transition-transform duration-300 ease-out motion-reduce:transition-none',
         locale === 'en' ? 'translate-x-full' : 'translate-x-0',
      ]"></span>
      <button v-for="option in options" :key="option.code" type="button" :aria-pressed="locale === option.code"
         :aria-label="option.label" :title="option.label" @click="setLocale(option.code)" :class="[
            'relative z-[1] flex items-center justify-center rounded-full font-anuphan-semi-bold transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primaryy-500/40',
            styles.segment,
            locale === option.code ? 'text-white' : 'text-grayy-75 hover:text-grayy-400',
         ]">
         {{ option.code.toUpperCase() }}
      </button>
   </div>
</template>

<script setup>
const props = defineProps({
   // md floats over the auth pages' artwork, sm sits inside the dashboard shell
   size: { type: String, default: "md" },
   // single pill for the collapsed sidebar
   compact: { type: Boolean, default: false },
});

const { locale, setLocale, t } = useI18n();

const SIZES = {
   sm: { track: "h-8 bg-grayy-50", segment: "w-8 text-xs" },
   md: { track: "h-[42px] bg-white shadow-sm", segment: "w-9 text-sm" },
};
const styles = computed(() => SIZES[props.size] || SIZES.md);

const options = computed(() => [
   { code: "th", label: t("language_th") },
   { code: "en", label: t("language_en") },
]);
const activeOption = computed(() => options.value.find((option) => option.code === locale.value) || options.value[0]);
const nextOption = computed(() => options.value.find((option) => option.code !== locale.value) || options.value[1]);
const switchLabel = computed(() => t("switch_language_to", { lang: nextOption.value.label }));

// Same tooltip styling as the collapsed sidebar menu items
const tooltipUi = {
   ring: "ring-gray-50",
   shadow: "shadow-none",
   base: "py-[6px] h-auto text-sm text-primary-500",
   rounded: "rounded-md",
   arrow: {
      base: "before:w-4 before:h-4",
      background: "before:bg-white",
      ring: "ring-0 before:ring-[#eaeaea]",
      shadow: "before:shadow-none",
   },
};
</script>
