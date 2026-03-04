export default {
  id: "knobs128",
  title: "Knobs (128)",
  containerClass: "knob-grid",
  controls: Array.from({ length: 128 }, (_, idx) => {
    const i = idx + 1;
    return {
      type: "knob",
      id: `knob${String(i).padStart(3, "0")}`,
      min: 0,
      max: 1,
      step: 0.001,
      width: 46,
      height: 46,
      colors: "#81a1c1;#4c566a;#444",
      oscPath: `/virtualctl/K${String(i).padStart(3, "0")}`,
    };
  }),
};
