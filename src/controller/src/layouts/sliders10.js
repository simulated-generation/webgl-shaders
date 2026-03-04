export default {
  id: "sliders10",
  title: "Sliders (10)",
  containerClass: "slider-stack",
  controls: Array.from({ length: 10 }, (_, idx) => {
    const i = idx + 1; // K001..K009
    return {
      type: "slider",
      id: `slider${String(i).padStart(3, "0")}`,
      direction: "horiz",
      min: 0,
      max: 1,
      step: 0.001,
      width: 420,
      height: 40,
      colors: "#81a1c1;#4c566a;#444",
      oscPath: `/virtualctl/F${String(i).padStart(3, "0")}`,
    };
  }),
};
