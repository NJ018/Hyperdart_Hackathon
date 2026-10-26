// Maps the icon names in lib/hazards.js to MUI icons (lib stays React-free).
import FloodIcon from '@mui/icons-material/Flood';
import ThermostatIcon from '@mui/icons-material/Thermostat';
import TornadoIcon from '@mui/icons-material/Tornado';
import CycloneIcon from '@mui/icons-material/Cyclone';
import AcUnitIcon from '@mui/icons-material/AcUnit';
import MasksIcon from '@mui/icons-material/Masks';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import WavesIcon from '@mui/icons-material/Waves';
import AirIcon from '@mui/icons-material/Air';
import ThunderstormIcon from '@mui/icons-material/Thunderstorm';
import CloudIcon from '@mui/icons-material/Cloud';
import TsunamiIcon from '@mui/icons-material/Tsunami';
import LandslideIcon from '@mui/icons-material/Landslide';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { hazardIcon } from '../lib/hazards.js';

const ICONS = {
  Flood: FloodIcon, Thermostat: ThermostatIcon, Tornado: TornadoIcon, Cyclone: CycloneIcon, AcUnit: AcUnitIcon,
  Masks: MasksIcon, LocalFireDepartment: LocalFireDepartmentIcon, Waves: WavesIcon, Air: AirIcon,
  Thunderstorm: ThunderstormIcon, Cloud: CloudIcon, Tsunami: TsunamiIcon, Landslide: LandslideIcon,
  WarningAmber: WarningAmberIcon,
};

export default function HazardIcon({ hazard, ...rest }) {
  const Icon = ICONS[hazardIcon(hazard)] ?? WarningAmberIcon;
  return <Icon aria-hidden="true" {...rest} />;
}
