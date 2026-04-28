import { useEffect, useState } from "react";
import type { Schema } from "../amplify/data/resource";
import { generateClient } from "aws-amplify/data";
import FireTestMap from "./components/FireTestMap";
import FireTestPanel from "./components/FireTestPanel";

const client = generateClient<Schema>();

function App() {
  const [fireTests, setFireTests] = useState<Array<Schema["FireTest"]["type"]>>([]);
  const [isPlacingPoint, setIsPlacingPoint] = useState(false);

  useEffect(() => {
    const sub = client.models.FireTest.observeQuery().subscribe({
      next: ({ items }) => setFireTests([...items]),
    });
    return () => sub.unsubscribe();
  }, []);

  // Step 1 — panel button clicked: enter "click to place" mode
  function handleStartPlacing() {
    setIsPlacingPoint(true);
  }

  // Step 2 — user clicked on the map: save lat/lng immediately, no prompts
  async function handlePointPlaced(lat: number, lng: number) {
    setIsPlacingPoint(false);
    await client.models.FireTest.create({ lat, lng });
  }

  function handleCancelPlacing() {
    setIsPlacingPoint(false);
  }

  return (
    <div className="app-layout">
      <FireTestPanel
        fireTests={fireTests}
        isPlacingPoint={isPlacingPoint}
        onStartPlacing={handleStartPlacing}
      />
      <div className="map-container">
        <FireTestMap
          fireTests={fireTests}
          isPlacingPoint={isPlacingPoint}
          onPointPlaced={handlePointPlaced}
          onCancelPlacing={handleCancelPlacing}
        />
      </div>
    </div>
  );
}

export default App;
