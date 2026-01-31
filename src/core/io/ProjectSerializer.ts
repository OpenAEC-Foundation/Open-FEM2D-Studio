import { Mesh } from '../fem/Mesh';
import { ILoadCase, ILoadCombination } from '../fem/LoadCase';
import { IProjectInfo } from '../../context/FEMContext';
import { IStructuralGrid } from '../fem/StructuralGrid';

export interface IProjectFile {
  version: string;
  projectInfo: IProjectInfo;
  mesh: object;
  loadCases: ILoadCase[];
  loadCombinations: { id: number; name: string; type: string; factors: [number, number][] }[];
  structuralGrid?: IStructuralGrid;
}

export function serializeProject(
  mesh: Mesh,
  loadCases: ILoadCase[],
  loadCombinations: ILoadCombination[],
  projectInfo: IProjectInfo,
  structuralGrid?: IStructuralGrid
): string {
  const file: IProjectFile = {
    version: '1.0.0',
    projectInfo,
    mesh: mesh.toJSON(),
    loadCases,
    loadCombinations: loadCombinations.map(lc => ({
      id: lc.id,
      name: lc.name,
      type: lc.type,
      factors: Array.from(lc.factors.entries())
    })),
    structuralGrid
  };
  return JSON.stringify(file, null, 2);
}

export function deserializeProject(json: string): {
  mesh: Mesh;
  loadCases: ILoadCase[];
  loadCombinations: ILoadCombination[];
  projectInfo: IProjectInfo;
  structuralGrid?: IStructuralGrid;
} {
  const file: IProjectFile = JSON.parse(json);

  const mesh = Mesh.fromJSON(file.mesh as Parameters<typeof Mesh.fromJSON>[0]);

  const loadCases = file.loadCases;

  const loadCombinations: ILoadCombination[] = file.loadCombinations.map(lc => ({
    id: lc.id,
    name: lc.name,
    type: lc.type as 'ULS' | 'SLS',
    factors: new Map(lc.factors)
  }));

  const projectInfo = file.projectInfo;
  const structuralGrid = file.structuralGrid;

  return { mesh, loadCases, loadCombinations, projectInfo, structuralGrid };
}
