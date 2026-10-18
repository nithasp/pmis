<script setup>
import NuxtIcon from "~/components/ui/nuxtIcon.vue";
import { ref, watch } from "vue";

const props = defineProps({
  placeholder: String,
  customIcon: {
    type: [Object, Array, String, Number, Boolean, Function, Symbol],
  },
  name: String,
  label: String,
  value: String,
  disabled: Boolean,
  error: {
    type: [String, Boolean],
    default: "",
  },
  icon: String,
  isView: {
    type: Boolean,
    default: false,
  },
  suffix: String,
  onBlur: Function,
  onChange: Function,
  noSpinner: {
    type: Boolean,
    default: false,
  },
  helpText: String,
  decimalPlaces: {
    type: [Number, String],
    default: 2,
  },
  modelValue: {
    type: [String, Number],
    default: null,
  },
});

const internalValue = ref(props.modelValue);

const formattedValue = ref(formatValue(props.modelValue));

const emit = defineEmits(["update:modelValue", "blur"]);

watch(
  () => props.modelValue,
  (newValue) => {
    formattedValue.value = formatValue(newValue);
  }
);

const handleKeypress = (event) => {
  const char = event.key;
  const inputElement = event.target;
  const currentValue = inputElement.value;
  const cursorPosition = inputElement.selectionStart;
  const selectionEnd = inputElement.selectionEnd;
  const isReplacing = cursorPosition !== selectionEnd;

  if (!/[\d.-]/.test(char)) {
    event.preventDefault();
    return;
  }

  if (char === "." && currentValue.includes(".") && !isReplacing) {
    event.preventDefault();
    return;
  }

  if (char === "-" && cursorPosition !== 0) {
    event.preventDefault();
    return;
  }

  if (currentValue.includes(".")) {
    const [integerPart, decimalPart] = currentValue.split(".");
    
    if (char !== "-" && char !== "." && decimalPart && decimalPart.length >= props.decimalPlaces && cursorPosition > currentValue.indexOf(".") && !isReplacing) {
      event.preventDefault();
    }
  }

  if (isReplacing) {
    const newValue =
      currentValue.slice(0, cursorPosition) + char + currentValue.slice(selectionEnd);
    
    if (newValue.split(".").length > 2 || (newValue.includes("-") && newValue.indexOf("-") !== 0)) {
      event.preventDefault();
    }
  }
};

function formatValue(value) {
  if (value == null || value === "") return "";
  const number = parseFloat(value);
  if (isNaN(number)) return value;
  return number.toLocaleString("en-US", {
    minimumFractionDigits: props.decimalPlaces,
    maximumFractionDigits: props.decimalPlaces,
  });
}

function onBlur(event) {
  const inputElement = event.target;
  let inputValue = inputElement.value.replace(/,/g, "");

  if (!inputValue.includes(".")) {
    const decimals = "0".repeat(props.decimalPlaces);
    inputValue = `${inputValue}.${decimals}`;
  } else {
    const [integerPart, decimalPart] = inputValue.split(".");
    const fixedDecimalPart = (decimalPart || "")
      .padEnd(props.decimalPlaces, "0")
      .slice(0, props.decimalPlaces);
    inputValue = `${integerPart}.${fixedDecimalPart}`;
  }

  if (typeof inputValue !== 'number') {
    inputValue = inputElement.value.replace(/,/g, "");
  }

  formattedValue.value = formatValue(inputValue);

  emit("update:modelValue", parseFloat(inputValue) || inputValue);
  emit("blur", event);
}

function onFocus(event) {
  event.target.select();
}
</script>

<template>
  <UFormGroup :label="label" :name="name" :error="error">
    <template #default="{ error }">
      <UInput v-if="!isView" :icon="icon" v-model="formattedValue" :value="formattedValue" size="md"
        :variant="disabled ? 'none' : 'outline'" color="purple" :placeholder="placeholder" :disabled="disabled"
        :type="'text'" @blur="onBlur" @change="onChange" @focus="onFocus" autocomplete="Off" @keypress="handleKeypress"
        :ui="{ wrapper: `rounded-md ${disabled ? 'bg-[#D0D5DD] text-grayy-75' : 'bg-white'}` }"
        :class="{ noSpinner: 'no-spinner' }">
        <template v-if="customIcon" #leading>
          <NuxtIcon :name="customIcon" size="xl" />
        </template>

        <template v-if="error || suffix" #trailing>
          <NuxtIcon v-if="error && !suffix" name="exclamation" color="text-error-500" />
          <span v-if="suffix">{{ suffix }}</span>
        </template>
        <template v-if="helpText" #help>
          <span class="text-[#F04438]">
            {{ helpText }}
          </span>
        </template>
      </UInput>
      <p class="text-grayy-75" v-else-if="value">
        {{ value ? value : "-" }}
      </p>
      <p class="text-grayy-75" v-else>
        {{ formattedValue ? formattedValue : "-" }}
      </p>
      <p v-if="helpText" class="text-[#F04438]">
        {{ helpText ? helpText : "-" }}
      </p>
    </template>
  </UFormGroup>
</template>

<style scoped>
.no-spinner::-webkit-inner-spin-button,
.no-spinner::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.no-spinner {
  -moz-appearance: textfield;
}
</style>
