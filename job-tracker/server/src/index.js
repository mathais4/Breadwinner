import { app } from './app.js';
import { PORT } from './config.js';

app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
