import en from "./en";

const dictionaries = {
  en,
};

export function t(key, params = {}, lang = "en") {
  const dict = dictionaries[lang] || dictionaries.en;
  let text = dict[key] || key;

  // Variable interpolation: {name} replaced by params.name
  if (params && typeof params === "object") {
    Object.entries(params).forEach(([k, v]) => {
      text = text.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
    });
  }

  return text;
}

export function useTranslation() {
  return {
    t: (key, params) => t(key, params, "en"),
    lang: "en",
  };
}
