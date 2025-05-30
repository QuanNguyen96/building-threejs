import { ColorPicker, useColor } from "react-color-palette";
import "react-color-palette/css";

export default function App() {
  const [color, setColor] = useColor("rgb(86 30 203)");

  return (
    <div className="app">
      <ColorPicker color={color} onChange={setColor} />
    </div>
  );
}
