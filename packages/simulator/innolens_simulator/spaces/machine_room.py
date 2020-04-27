from __future__ import annotations

from ..engine.object import Object

from ..machines.computer import Computer
from ..machines.waterjet_cutting_machine import WaterjetCuttingMachine
from ..machines.cnc_milling_machine import CNCMillingMachine
from ..machines.desktop_cnc import DesktopCNC
from ..machines.lathe import Lathe
from ..machines.bench_tool_grinder_sharpener import BenchToolGrinderSharpener
from ..machines.drilling_machine import DrillingMachine

from ..reusable_inventories.grinder import Grinder
from ..reusable_inventories.misc_cordless_tool import MiscCordlessTool
from ..reusable_inventories.saw import Saw
from ..reusable_inventories.drill import Drill
from ..reusable_inventories.measuring_tool import MeasuringTool
from ..reusable_inventories.hand_tool import HandTool
from ..reusable_inventories.vacuum_cleaner import VacuumCleaner

from ..expendable_inventories.wood_plank import WoodPlank
from ..expendable_inventories.electric_wire import ElectricWire
from ..expendable_inventories.foam_panel import FoamPanel

from .space import Space


class MachineRoom(Space):
  space_id = 'machine_room'
  space_name = 'Machine Room'

  __wood_plank: WoodPlank
  __electric_wire: ElectricWire
  __foam_panel: FoamPanel

  def __init__(self, attached_object: Object):
    super().__init__(attached_object)
    self.__add_computers()
    self.__add_waterjet_cutting_machines()
    self.__add_cnc_milling_machines()
    self.__add_desktop_cncs()
    self.__add_lathes()
    self.__add_bench_tool_grinder_sharpeners()
    self.__add_drilling_machines()

    self.__add_grinders()
    self.__add_misc_cordless_tools()
    self.__add_saws()
    self.__add_drills()
    self.__add_measuring_tools()
    self.__add_hand_tools()
    self.__add_vacuum_cleaners()

    self.__add_wood_plank()
    self.__add_electric_wire()
    self.__add_foam_panel()


  def __add_computers(self) -> None:
    for i in range(2):
      machine_obj = self.engine.create_object()
      machine = machine_obj.add_component(Computer)
      machine.instance_id = f'machine_room_{i}'
      machine.instance_name = f'Machine Room Computer {i}'
      self.attached_object.add_object(machine_obj)

  def __add_waterjet_cutting_machines(self) -> None:
    for i in range(1):
      machine_obj = self.engine.create_object()
      machine = machine_obj.add_component(WaterjetCuttingMachine)
      machine.instance_id = str(i)
      self.attached_object.add_object(machine_obj)

  def __add_cnc_milling_machines(self) -> None:
    for i in range(1):
      machine_obj = self.engine.create_object()
      machine = machine_obj.add_component(CNCMillingMachine)
      machine.instance_id = str(i)
      self.attached_object.add_object(machine_obj)

  def __add_desktop_cncs(self) -> None:
    for i in range(1):
      machine_obj = self.engine.create_object()
      machine = machine_obj.add_component(DesktopCNC)
      machine.instance_id = str(i)
      self.attached_object.add_object(machine_obj)

  def __add_lathes(self) -> None:
    for i in range(1):
      machine_obj = self.engine.create_object()
      machine = machine_obj.add_component(Lathe)
      machine.instance_id = str(i)
      self.attached_object.add_object(machine_obj)

  def __add_bench_tool_grinder_sharpeners(self) -> None:
    for i in range(1):
      machine_obj = self.engine.create_object()
      machine = machine_obj.add_component(BenchToolGrinderSharpener)
      machine.instance_id = str(i)
      self.attached_object.add_object(machine_obj)

  def __add_drilling_machines(self) -> None:
    for i in range(1):
      machine_obj = self.engine.create_object()
      machine = machine_obj.add_component(DrillingMachine)
      machine.instance_id = str(i)
      self.attached_object.add_object(machine_obj)

  def __add_grinders(self) -> None:
    for i in range(1):
      inventory_obj = self.engine.create_object()
      inventory = inventory_obj.add_component(Grinder)
      inventory.instance_id = f'tool_grinder'
      inventory.instance_name = f'Tool Grinder'
      self.attached_object.add_object(inventory_obj)

    for i in range(2):
      inventory_obj = self.engine.create_object()
      inventory = inventory_obj.add_component(Grinder)
      inventory.instance_id = f'cordless_angle_grinder_{i}'
      inventory.instance_name = f'Cordless Angle Grinder {i}'
      self.attached_object.add_object(inventory_obj)

  def __add_misc_cordless_tools(self) -> None:
    for i in range(1):
      inventory_obj = self.engine.create_object()
      inventory = inventory_obj.add_component(MiscCordlessTool)
      inventory.instance_id = f'cordless_stapler_gun'
      inventory.instance_name = f'Cordless Stapler Gun'
      self.attached_object.add_object(inventory_obj)

    for i in range(1):
      inventory_obj = self.engine.create_object()
      inventory = inventory_obj.add_component(MiscCordlessTool)
      inventory.instance_id = f'cordless_accu_tacker'
      inventory.instance_name = f'Cordless Accu Tacker'
      self.attached_object.add_object(inventory_obj)

    for i in range(1):
      inventory_obj = self.engine.create_object()
      inventory = inventory_obj.add_component(MiscCordlessTool)
      inventory.instance_id = f'cordless_brad_nailer'
      inventory.instance_name = f'Cordless Brad Nailer'
      self.attached_object.add_object(inventory_obj)

    for i in range(1):
      inventory_obj = self.engine.create_object()
      inventory = inventory_obj.add_component(MiscCordlessTool)
      inventory.instance_id = f'cordless_metal_cutter'
      inventory.instance_name = f'Cordless Metal Cutter'
      self.attached_object.add_object(inventory_obj)

    for i in range(1):
      inventory_obj = self.engine.create_object()
      inventory = inventory_obj.add_component(MiscCordlessTool)
      inventory.instance_id = f'cordless_random_orbit_sander'
      inventory.instance_name = f'Cordless Random Orbit Sander'
      self.attached_object.add_object(inventory_obj)

    for i in range(1):
      inventory_obj = self.engine.create_object()
      inventory = inventory_obj.add_component(MiscCordlessTool)
      inventory.instance_id = f'cordless_router_trimmer'
      inventory.instance_name = f'Cordless Router Trimmer'
      self.attached_object.add_object(inventory_obj)

  def __add_saws(self) -> None:
    for i in range(1):
      inventory_obj = self.engine.create_object()
      inventory = inventory_obj.add_component(Saw)
      inventory.instance_id = f'cordless_slide_compound_mitre_saw'
      inventory.instance_name = f'Cordless Slide Compound Mitre Saw'
      self.attached_object.add_object(inventory_obj)

    for i in range(1):
      inventory_obj = self.engine.create_object()
      inventory = inventory_obj.add_component(Saw)
      inventory.instance_id = f'cordless_compound_miter_saw'
      inventory.instance_name = f'Cordless Compound Miter Saw'
      self.attached_object.add_object(inventory_obj)

    for i in range(2):
      inventory_obj = self.engine.create_object()
      inventory = inventory_obj.add_component(Saw)
      inventory.instance_id = f'cordless_circular_saw_{i}'
      inventory.instance_name = f'Cordless Circular Saw {i}'
      self.attached_object.add_object(inventory_obj)

    for i in range(2):
      inventory_obj = self.engine.create_object()
      inventory = inventory_obj.add_component(Saw)
      inventory.instance_id = f'cordless_jig_saw_{i}'
      inventory.instance_name = f'Cordless Jig Saw {i}'
      self.attached_object.add_object(inventory_obj)

    for i in range(1):
      inventory_obj = self.engine.create_object()
      inventory = inventory_obj.add_component(Saw)
      inventory.instance_id = f'band_saw'
      inventory.instance_name = f'Band Saw'
      self.attached_object.add_object(inventory_obj)

    for i in range(1):
      inventory_obj = self.engine.create_object()
      inventory = inventory_obj.add_component(Saw)
      inventory.instance_id = f'horizontal_metal_cutting_band_saw'
      inventory.instance_name = f'Horizontal Metal Cutting Band Saw'
      self.attached_object.add_object(inventory_obj)

  def __add_drills(self) -> None:
    for i in range(2):
      inventory_obj = self.engine.create_object()
      inventory = inventory_obj.add_component(Drill)
      inventory.instance_id = f'cordless_angle_drill_{i}'
      inventory.instance_name = f'Cordless Angle Drill {i}'
      self.attached_object.add_object(inventory_obj)

    for i in range(1):
      inventory_obj = self.engine.create_object()
      inventory = inventory_obj.add_component(Drill)
      inventory.instance_id = f'cordless_rotary_hammer_drill'
      inventory.instance_name = f'Cordless Rotary Hammer Drill'
      self.attached_object.add_object(inventory_obj)

    for i in range(10):
      inventory_obj = self.engine.create_object()
      inventory = inventory_obj.add_component(Drill)
      inventory.instance_id = f'cordless_driver_drill_{i}'
      inventory.instance_name = f'Cordless Driver Drill {i}'
      self.attached_object.add_object(inventory_obj)

  def __add_measuring_tools(self) -> None:
    for id, name in (
      (f'micrometer_external', f'Micrometer External'),
      (f'digimatic_height_gauge', f'Digimatic Height Gauge'),
      (f'surface_gauge', f'Surface Gauge'),
      (f'surface_plate', f'Surface Plate'),
      (f'parallels_set_1', f'Parallels Set 1'),
      (f'parallels_set_2', f'Parallels Set 2'),
      (f'angle_plate', f'Angle Plate'),
      (f'vee_block_1', f'Vee Block 1'),
      (f'vee_block_2', f'Vee Block 2'),
      (f'combination_set', f'Combination Set'),
      (f'external_micrometer_1', f'External Micrometer 1'),
      (f'external_micrometer_2', f'External Micrometer 2'),
      (f'internal_micrometer_1', f'Internal Micrometer 1'),
      (f'internal_micrometer_2', f'Internal Micrometer 2'),
      (f'depth_gauge_micrometer', f'Depth Gauge Micrometer'),
      (f'dial_indicator_set', f'Dial Indicator Set'),
      (f'electronic_balance', f'Electronic Balance'),
      (f'torque_wrench', f'Torque Wrench'),
      (f'force_gauge', f'Force Gauge'),
      (f'pipe_and_live_wire_detector', f'Pipe And Live Wire Detector'),
    ):
      inventory_obj = self.engine.create_object()
      inventory = inventory_obj.add_component(MeasuringTool)
      inventory.instance_id = id
      inventory.instance_name = name
      self.attached_object.add_object(inventory_obj)

  def __add_hand_tools(self) -> None:
    for i in range(10):
      inventory_obj = self.engine.create_object()
      inventory = inventory_obj.add_component(HandTool)
      inventory.instance_id = f'tooled_equipment_trolley_{i}'
      inventory.instance_name = f'Tooled Equipment Trolley {i}'
      self.attached_object.add_object(inventory_obj)

    for i in range(6):
      inventory_obj = self.engine.create_object()
      inventory = inventory_obj.add_component(HandTool)
      inventory.instance_id = f'equipment_trolley_{i}'
      inventory.instance_name = f'Equipment Trolley {i}'
      self.attached_object.add_object(inventory_obj)

  def __add_vacuum_cleaners(self) -> None:
    for i in range(3):
      inventory_obj = self.engine.create_object()
      inventory = inventory_obj.add_component(VacuumCleaner)
      inventory.instance_id = f'vacuum_cleaner_{i}'
      inventory.instance_name = f'Vacuum Cleaner {i}'
      self.attached_object.add_object(inventory_obj)

  def __add_wood_plank(self) -> None:
    plank_obj = self.engine.create_object()
    self.__wood_plank = plank_obj.add_component(WoodPlank)
    self.attached_object.add_object(plank_obj)

  def __add_electric_wire(self) -> None:
    wire_obj = self.engine.create_object()
    self.__electric_wire = wire_obj.add_component(ElectricWire)
    self.attached_object.add_object(wire_obj)

  def __add_foam_panel(self) -> None:
    foam_obj = self.engine.create_object()
    self.__foam_panel = foam_obj.add_component(FoamPanel)
    self.attached_object.add_object(foam_obj)

  def _on_next_tick(self) -> None:
    curr_time = self.engine.clock.current_time

    # Refill wood plank to 100 every Monday
    if (
      curr_time.weekday() == 0
      and curr_time.hour == 0
      and curr_time.minute == 0
    ):
      self.__wood_plank.set_quantity(100)
    elif (
      curr_time.weekday() == 1
      and curr_time.hour == 0
      and curr_time.minute == 0
    ):
      self.__electric_wire.set_quantity(200)
    elif (
      curr_time.weekday() == 2
      and curr_time.hour == 0
      and curr_time.minute == 0
    ):
      self.__foam_panel.set_quantity(50)
