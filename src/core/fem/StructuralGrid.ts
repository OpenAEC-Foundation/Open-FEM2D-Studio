export interface IGridLine {
  id: number;
  name: string;          // "A", "B", "C" or "1", "2", "3"
  position: number;      // X (vertical) or Y (horizontal) in meters
  orientation: 'vertical' | 'horizontal';
}

export interface IStructuralGrid {
  verticalLines: IGridLine[];     // stramienen
  horizontalLines: IGridLine[];   // levels/peilen
  showGridLines: boolean;
  snapToGridLines: boolean;
}
