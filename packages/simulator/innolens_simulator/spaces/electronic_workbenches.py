from __future__ import annotations

from ..engine.object import Object

from ..machines.soldering_station import SolderingStation

from ..reusable_inventories.digital_tachometer import DigitalTachometer
from ..reusable_inventories.soldering_pot import SolderingPot
from ..reusable_inventories.waveform_generator import WaveformGenerator
from ..reusable_inventories.function_generator import FunctionGenerator
from ..reusable_inventories.dc_power_supply import DcPowerSupply
from ..reusable_inventories.oscilloscope import Oscilloscope
from ..reusable_inventories.multi_meter import MultiMeter
from ..reusable_inventories.megger_tester import MeggerTester
from ..reusable_inventories.inductance_capacitance_meter import InductanceCapacitanceMeter

from .space import Space

class ElectronicWorkbenches(Space):
  space_id = 'electronic_workbenches'
  space_name = 'Electronic Workbenches'

  def __init__(self, attached_object: Object):
    super().__init__(attached_object)
    self.__add_soldering_stations()
    
    self.__add_digital_tachometers()
    self.__add_soldering_pots()
    self.__add_waveform_generators()
    self.__add_function_generators()
    self.__add_dc_power_supplies()
    self.__add_oscilloscopes()
    self.__add_multi_meters()
    self.__add_megger_testers()
    self.__add_inductance_capacitance_meters()

  def __add_soldering_stations(self) -> None:
    for i in range(6):
      machine_obj = self.engine.create_object()
      machine = machine_obj.add_component(SolderingStation)
      machine.instance_id = f'soldering_station_{i}'
      machine.instance_name = f'Soldering Station {i}'
      self.attached_object.add_object(machine_obj)

  def __add_digital_tachometers(self) -> None:
    for i in range(1):
      inventory_obj = self.engine.create_object()
      inventory = inventory_obj.add_component(DigitalTachometer)
      inventory.instance_id = f'digital_tachometer_higher_grade'
      inventory.instance_name = f'Digital Tachometer - Higher Grade'
      self.attached_object.add_object(inventory_obj)

    for i in range(1):
      inventory_obj = self.engine.create_object()
      inventory = inventory_obj.add_component(DigitalTachometer)
      inventory.instance_id = f'digital_tachometer_general_grade'
      inventory.instance_name = f'Digital Tachometer - General Grade'
      self.attached_object.add_object(inventory_obj)

  def __add_soldering_pots(self) -> None:
    for i in range(2):
      inventory_obj = self.engine.create_object()
      inventory = inventory_obj.add_component(SolderingPot)
      inventory.instance_id = f'soldering_pot_{i}'
      inventory.instance_name = f'Soldering Pot {i}'
      self.attached_object.add_object(inventory_obj)

  def __add_waveform_generators(self) -> None:
    for i in range(1):
      inventory_obj = self.engine.create_object()
      inventory = inventory_obj.add_component(WaveformGenerator)
      inventory.instance_id = f'waveform_generator'
      inventory.instance_name = f'Waveform Generator'
      self.attached_object.add_object(inventory_obj)

  def __add_function_generators(self) -> None:
    for i in range(5):
      inventory_obj = self.engine.create_object()
      inventory = inventory_obj.add_component(FunctionGenerator)
      inventory.instance_id = f'function_generator_{i}'
      inventory.instance_name = f'Function Generator {i}'
      self.attached_object.add_object(inventory_obj)

  def __add_dc_power_supplies(self) -> None:
    for i in range(6):
      inventory_obj = self.engine.create_object()
      inventory = inventory_obj.add_component(DcPowerSupply)
      inventory.instance_id = f'single_output_dc_power_supply_{i}'
      inventory.instance_name = f'Single-Output DC Power Supply {i}'
      self.attached_object.add_object(inventory_obj)

    for i in range(6):
      inventory_obj = self.engine.create_object()
      inventory = inventory_obj.add_component(DcPowerSupply)
      inventory.instance_id = f'dc_power_supply_{i}'
      inventory.instance_name = f'DC Power Supply {i}'
      self.attached_object.add_object(inventory_obj)

  def __add_oscilloscopes(self) -> None:
    for i in range(1):
      inventory_obj = self.engine.create_object()
      inventory = inventory_obj.add_component(Oscilloscope)
      inventory.instance_id = f'digital_oscilloscope_200_mhz_4_channels_higher_grade'
      inventory.instance_name = f'Digital Oscilloscope 200 MHz 4 Channels - Higher Grade'
      self.attached_object.add_object(inventory_obj)

    for i in range(5):
      inventory_obj = self.engine.create_object()
      inventory = inventory_obj.add_component(Oscilloscope)
      inventory.instance_id = f'digital_oscilloscope_100_mhz_4_channels_general_grade_{i}'
      inventory.instance_name = f'Digital Oscilloscope 100 MHz 4 Channels - General Grade {i}'
      self.attached_object.add_object(inventory_obj)

  def __add_multi_meters(self) -> None:
    for i in range(1):
      inventory_obj = self.engine.create_object()
      inventory = inventory_obj.add_component(MultiMeter)
      inventory.instance_id = f'digital_multi_meter_higher_grade'
      inventory.instance_name = f'Digital Multi-Meter - Higher Grade'
      self.attached_object.add_object(inventory_obj)

    for i in range(5):
      inventory_obj = self.engine.create_object()
      inventory = inventory_obj.add_component(MultiMeter)
      inventory.instance_id = f'digital_multi_meter_general_grade_{i}'
      inventory.instance_name = f'Digital Multi-Meter - General Grade {i}'
      self.attached_object.add_object(inventory_obj)

    for i in range(10):
      inventory_obj = self.engine.create_object()
      inventory = inventory_obj.add_component(MultiMeter)
      inventory.instance_id = f'digital_multi_meter_portable_{i}'
      inventory.instance_name = f'Digital Multi-Meter - Portable {i}'
      self.attached_object.add_object(inventory_obj)

    for i in range(1):
      inventory_obj = self.engine.create_object()
      inventory = inventory_obj.add_component(MultiMeter)
      inventory.instance_id = f'digital_ac_dc_clamp_multi_meter_general_grade'
      inventory.instance_name = f'Digital AC/DC Clamp Multi-Meter - General Grade'
      self.attached_object.add_object(inventory_obj)

    for i in range(6):
      inventory_obj = self.engine.create_object()
      inventory = inventory_obj.add_component(MultiMeter)
      inventory.instance_id = f'digital_ac_dc_clamp_multi_meter_{i}'
      inventory.instance_name = f'Digital AC/DC Clamp Multi-Meter {i}'
      self.attached_object.add_object(inventory_obj)

  def __add_megger_testers(self) -> None:
    for i in range(1):
      inventory_obj = self.engine.create_object()
      inventory = inventory_obj.add_component(MeggerTester)
      inventory.instance_id = f'megger_tester'
      inventory.instance_name = f'Megger Tester {i}'
      self.attached_object.add_object(inventory_obj)

  def __add_inductance_capacitance_meters(self) -> None:
    for i in range(6):
      inventory_obj = self.engine.create_object()
      inventory = inventory_obj.add_component(InductanceCapacitanceMeter)
      inventory.instance_id = f'inductance_capacitance_meter_{i}'
      inventory.instance_name = f'Inductance Capacitance Meter {i}'
      self.attached_object.add_object(inventory_obj)
