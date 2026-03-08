import { ToolDefinition, ErrorResult } from '../types';
import { StructuredLogger } from '../../../logger';
import { CodingAgentInterface } from 'worker/agents/services/implementations/CodingAgent';

interface FileCategory {
	category: string;
	files: string[];
}

interface AnalyzeResult {
	totalFiles: number;
	categories: FileCategory[];
	issues: string[];
	suggestions: string[];
}

interface MoveOperation {
	from: string;
	to: string;
}

interface MoveResult {
	moved: MoveOperation[];
	updatedImports: { file: string; count: number }[];
	failed: { from: string; reason: string }[];
}

interface DeleteResult {
	deleted: string[];
	failed: { path: string; reason: string }[];
}

export type OrganizeFilesArgs = {
	action: 'analyze' | 'move' | 'delete';
	moves?: MoveOperation[];
	deletePaths?: string[];
};

export type OrganizeFilesResult =
	| { action: 'analyze'; result: AnalyzeResult }
	| { action: 'move'; result: MoveResult }
	| { action: 'delete'; result: DeleteResult }
	| ErrorResult;

const FILE_CATEGORIES: Record<string, RegExp[]> = {
	'Components': [/\.(tsx|jsx)$/, /components?\//i],
	'Hooks': [/hooks?\//i, /^use[A-Z]/],
	'Utilities': [/utils?\//i, /helpers?\//i, /lib\//i],
	'Styles': [/\.(css|scss|less|sass)$/, /styles?\//i],
	'Types': [/types?\.(ts|tsx)$/, /\.d\.ts$/],
	'Configuration': [/\.(json|yaml|yml|toml)$/, /config/i, /\.env/],
	'Tests': [/\.(test|spec)\.(ts|tsx|js|jsx)$/, /__tests__\//],
	'API/Routes': [/api\//i, /routes?\//i, /controllers?\//i],
	'Assets': [/assets?\//i, /public\//i, /static\//i],
	'Pages/Views': [/pages?\//i, /views?\//i, /screens?\//i],
	'State Management': [/store\//i, /context\//i, /reducers?\//i, /slices?\//i],
	'Services': [/services?\//i, /providers?\//i],
};

function categorizeFile(filePath: string): string {
	for (const [category, patterns] of Object.entries(FILE_CATEGORIES)) {
		if (patterns.some(p => p.test(filePath))) {
			return category;
		}
	}

	if (/\.(ts|tsx|js|jsx)$/.test(filePath)) return 'Source';
	if (/\.(md|txt|rst)$/.test(filePath)) return 'Documentation';
	return 'Other';
}

function detectOrganizationIssues(files: string[]): { issues: string[]; suggestions: string[] } {
	const issues: string[] = [];
	const suggestions: string[] = [];

	// Check for deeply nested files (>5 levels)
	const deepFiles = files.filter(f => f.split('/').length > 6);
	if (deepFiles.length > 0) {
		issues.push(`${deepFiles.length} file(s) nested more than 5 levels deep`);
		suggestions.push('Consider flattening deeply nested directories to improve navigability');
	}

	// Check for files at root that should be in directories
	const rootSourceFiles = files.filter(f => {
		const parts = f.split('/');
		return parts.length === 1 && /\.(ts|tsx|js|jsx)$/.test(f) && f !== 'index.ts' && f !== 'index.tsx';
	});
	if (rootSourceFiles.length > 3) {
		issues.push(`${rootSourceFiles.length} source files at project root - consider organizing into directories`);
		suggestions.push('Group root-level source files into appropriate directories (src/, lib/, utils/)');
	}

	// Check for inconsistent naming conventions
	const sourceFiles = files.filter(f => /\.(ts|tsx|js|jsx)$/.test(f));
	const kebabCase = sourceFiles.filter(f => {
		const name = f.split('/').pop() || '';
		return /^[a-z][a-z0-9]*(-[a-z0-9]+)+\.\w+$/.test(name);
	});
	const camelCase = sourceFiles.filter(f => {
		const name = f.split('/').pop() || '';
		return /^[a-z][a-zA-Z0-9]*\.\w+$/.test(name) && !name.includes('-');
	});
	const pascalCase = sourceFiles.filter(f => {
		const name = f.split('/').pop() || '';
		return /^[A-Z][a-zA-Z0-9]*\.\w+$/.test(name);
	});
	const conventions = [
		{ name: 'kebab-case', count: kebabCase.length },
		{ name: 'camelCase', count: camelCase.length },
		{ name: 'PascalCase', count: pascalCase.length },
	].filter(c => c.count > 0);
	if (conventions.length > 1) {
		const breakdown = conventions.map(c => `${c.name}: ${c.count}`).join(', ');
		issues.push(`Mixed naming conventions detected (${breakdown})`);
		suggestions.push('Standardize file naming: PascalCase for components, kebab-case for utilities/hooks');
	}

	// Check for scattered related files
	const componentDirs = new Set<string>();
	files.forEach(f => {
		if (/components?\//i.test(f)) {
			const dir = f.split('/').slice(0, -1).join('/');
			componentDirs.add(dir);
		}
	});
	if (componentDirs.size > 5) {
		issues.push(`Components spread across ${componentDirs.size} different directories`);
		suggestions.push('Consider consolidating related components into fewer, well-organized directories');
	}

	// Check for orphaned files (single files in directories)
	const dirFileCounts: Record<string, number> = {};
	files.forEach(f => {
		const dir = f.split('/').slice(0, -1).join('/') || '.';
		dirFileCounts[dir] = (dirFileCounts[dir] || 0) + 1;
	});
	const singleFileDirs = Object.entries(dirFileCounts)
		.filter(([dir, count]) => count === 1 && dir !== '.' && !dir.includes('node_modules'))
		.map(([dir]) => dir);
	if (singleFileDirs.length > 3) {
		issues.push(`${singleFileDirs.length} directories contain only a single file`);
		suggestions.push('Consolidate single-file directories with their parent or sibling directories');
	}

	// Check for duplicate file names across directories
	const fileNames: Record<string, string[]> = {};
	files.forEach(f => {
		const name = f.split('/').pop() || '';
		if (!fileNames[name]) fileNames[name] = [];
		fileNames[name].push(f);
	});
	const duplicates = Object.entries(fileNames).filter(([, paths]) => paths.length > 1);
	if (duplicates.length > 0) {
		const topDuplicates = duplicates.slice(0, 5).map(([name, paths]) => `${name} (${paths.length}x)`).join(', ');
		issues.push(`Duplicate file names found: ${topDuplicates}`);
		suggestions.push('Rename duplicate files or consolidate them if they serve the same purpose');
	}

	if (issues.length === 0) {
		suggestions.push('File structure looks well-organized');
	}

	return { issues, suggestions };
}

function resolveImportPath(fromFile: string, importPath: string): string | null {
	if (importPath.startsWith('.')) {
		const fromDir = fromFile.split('/').slice(0, -1);
		const importParts = importPath.split('/');
		const resolved = [...fromDir];

		for (const part of importParts) {
			if (part === '.') continue;
			if (part === '..') {
				resolved.pop();
			} else {
				resolved.push(part);
			}
		}
		return resolved.join('/');
	}
	return null;
}

function computeRelativeImport(fromFile: string, toFile: string): string {
	const fromParts = fromFile.split('/').slice(0, -1);
	const toParts = toFile.split('/');
	const toFileName = toParts.pop() || '';
	const toDir = toParts;

	let commonLength = 0;
	while (
		commonLength < fromParts.length &&
		commonLength < toDir.length &&
		fromParts[commonLength] === toDir[commonLength]
	) {
		commonLength++;
	}

	const upCount = fromParts.length - commonLength;
	const downPath = toDir.slice(commonLength);

	let relativePath: string;
	if (upCount === 0) {
		relativePath = './' + [...downPath, toFileName].join('/');
	} else {
		relativePath = '../'.repeat(upCount) + [...downPath, toFileName].join('/');
	}

	// Strip file extension for imports
	return relativePath.replace(/\.(ts|tsx|js|jsx)$/, '');
}

function updateImportsInContent(
	content: string,
	filePath: string,
	moves: MoveOperation[]
): { updated: string; changeCount: number } {
	let updated = content;
	let changeCount = 0;

	// Match import/require/export statements with relative paths
	const importRegex = /(from\s+['"])([^'"]+)(['"])|((require|import)\s*\(\s*['"])([^'"]+)(['"]\s*\))/g;

	updated = content.replace(importRegex, (match, fromPrefix, fromPath, fromSuffix, reqPrefix, _reqKeyword, reqPath, reqSuffix) => {
		const importPath = fromPath || reqPath;
		const prefix = fromPrefix || reqPrefix;
		const suffix = fromSuffix || reqSuffix;

		if (!importPath.startsWith('.')) return match;

		const resolvedPath = resolveImportPath(filePath, importPath);
		if (!resolvedPath) return match;

		// Check if any moved file matches this resolved import
		for (const move of moves) {
			const fromBase = move.from.replace(/\.(ts|tsx|js|jsx)$/, '');
			const resolvedBase = resolvedPath.replace(/\.(ts|tsx|js|jsx)$/, '');

			// Check exact match or index file match
			if (resolvedBase === fromBase || resolvedBase === fromBase + '/index') {
				const newRelative = computeRelativeImport(filePath, move.to);
				changeCount++;
				return `${prefix}${newRelative}${suffix}`;
			}
		}

		return match;
	});

	return { updated, changeCount };
}

export function createOrganizeFilesTool(
	agent: CodingAgentInterface,
	logger: StructuredLogger,
): ToolDefinition<OrganizeFilesArgs, OrganizeFilesResult> {
	return {
		type: 'function' as const,
		function: {
			name: 'organize_files',
			description:
				`Analyze, move, rename, or delete project files to improve organization.

Actions:
- "analyze": Scan the file tree, categorize files by type, and identify organizational issues (naming inconsistencies, deeply nested files, scattered components, orphaned directories).
- "move": Move/rename files and automatically update all relative import references across the project. Provide an array of {from, to} operations.
- "delete": Remove files from the project. Provide an array of file paths to delete.

Use "analyze" first to understand the current structure before making changes.`,
			parameters: {
				type: 'object',
				properties: {
					action: {
						type: 'string',
						enum: ['analyze', 'move', 'delete'],
						description: 'The organization action to perform',
					},
					moves: {
						type: 'array',
						items: {
							type: 'object',
							properties: {
								from: { type: 'string', description: 'Current file path (relative to project root)' },
								to: { type: 'string', description: 'New file path (relative to project root)' },
							},
							required: ['from', 'to'],
						},
						description: 'File move operations (required for "move" action)',
					},
					deletePaths: {
						type: 'array',
						items: { type: 'string' },
						description: 'File paths to delete (required for "delete" action)',
					},
				},
				required: ['action'],
			},
		},
		implementation: async (args) => {
			try {
				const { action, moves, deletePaths } = args;

				if (action === 'analyze') {
					return await analyzeFiles(agent, logger);
				}

				if (action === 'move') {
					if (!moves || moves.length === 0) {
						return { error: 'The "moves" parameter is required for the "move" action' };
					}
					return await moveFiles(agent, logger, moves);
				}

				if (action === 'delete') {
					if (!deletePaths || deletePaths.length === 0) {
						return { error: 'The "deletePaths" parameter is required for the "delete" action' };
					}
					return await deleteFiles(agent, logger, deletePaths);
				}

				return { error: `Unknown action: ${action}` };
			} catch (error) {
				return {
					error: error instanceof Error
						? `File organization failed: ${error.message}`
						: 'Unknown error during file organization',
				};
			}
		},
	};
}

async function analyzeFiles(
	agent: CodingAgentInterface,
	logger: StructuredLogger,
): Promise<OrganizeFilesResult> {
	logger.info('Analyzing file structure');

	const filePaths = await agent.getOrganizableFilePaths();

	const categoryMap: Record<string, string[]> = {};
	for (const filePath of filePaths) {
		const category = categorizeFile(filePath);
		if (!categoryMap[category]) categoryMap[category] = [];
		categoryMap[category].push(filePath);
	}

	const categories: FileCategory[] = Object.entries(categoryMap)
		.map(([category, files]) => ({ category, files: files.sort() }))
		.sort((a, b) => b.files.length - a.files.length);

	const { issues, suggestions } = detectOrganizationIssues(filePaths);

	logger.info('Analysis complete', {
		totalFiles: filePaths.length,
		categories: categories.length,
		issues: issues.length,
	});

	return {
		action: 'analyze',
		result: { totalFiles: filePaths.length, categories, issues, suggestions },
	};
}

async function moveFiles(
	agent: CodingAgentInterface,
	logger: StructuredLogger,
	moves: MoveOperation[],
): Promise<OrganizeFilesResult> {
	logger.info('Moving files', { count: moves.length });

	const moved: MoveOperation[] = [];
	const failed: { from: string; reason: string }[] = [];
	const updatedImports: { file: string; count: number }[] = [];

	// Validate all moves first
	const filePaths = await agent.getOrganizableFilePaths();
	const existingPaths = new Set(filePaths);

	for (const move of moves) {
		if (!existingPaths.has(move.from)) {
			failed.push({ from: move.from, reason: 'Source file does not exist' });
		} else if (existingPaths.has(move.to)) {
			failed.push({ from: move.from, reason: `Destination already exists: ${move.to}` });
		}
	}

	const validMoves = moves.filter(m => !failed.some(f => f.from === m.from));
	if (validMoves.length === 0) {
		return { action: 'move', result: { moved, updatedImports, failed } };
	}

	// Read all files to update imports
	const readResult = await agent.readFiles(filePaths);
	const fileContents: Record<string, string> = {};
	for (const f of readResult.files) {
		fileContents[f.path] = f.content;
	}

	// Perform moves and collect import updates
	const filesToSave: Array<{ filePath: string; fileContents: string; filePurpose: string }> = [];
	const pathsToDelete: string[] = [];

	for (const move of validMoves) {
		const content = fileContents[move.from];
		if (content === undefined) {
			failed.push({ from: move.from, reason: 'Could not read file contents' });
			continue;
		}

		// Update internal imports in the moved file itself
		const { updated: selfUpdated, changeCount: selfChanges } = updateImportsInContent(
			content, move.to, validMoves
		);

		filesToSave.push({
			filePath: move.to,
			fileContents: selfUpdated,
			filePurpose: `Moved from ${move.from}`,
		});
		pathsToDelete.push(move.from);
		moved.push(move);

		if (selfChanges > 0) {
			updatedImports.push({ file: move.to, count: selfChanges });
		}
	}

	// Update import references in all other files
	const movedFromPaths = new Set(validMoves.map(m => m.from));
	const movedToPaths = new Set(validMoves.map(m => m.to));

	for (const [filePath, content] of Object.entries(fileContents)) {
		if (movedFromPaths.has(filePath) || movedToPaths.has(filePath)) continue;
		if (!/\.(ts|tsx|js|jsx)$/.test(filePath)) continue;

		const { updated, changeCount } = updateImportsInContent(content, filePath, validMoves);
		if (changeCount > 0) {
			filesToSave.push({
				filePath,
				fileContents: updated,
				filePurpose: `Updated imports for moved files`,
			});
			updatedImports.push({ file: filePath, count: changeCount });
		}
	}

	// Save all updated files and remove old paths
	await agent.saveOrganizedFiles(filesToSave, pathsToDelete);

	logger.info('File moves complete', {
		moved: moved.length,
		importUpdates: updatedImports.length,
		failed: failed.length,
	});

	return { action: 'move', result: { moved, updatedImports, failed } };
}

async function deleteFiles(
	agent: CodingAgentInterface,
	logger: StructuredLogger,
	deletePaths: string[],
): Promise<OrganizeFilesResult> {
	logger.info('Deleting files', { count: deletePaths.length });

	const deleted: string[] = [];
	const failed: { path: string; reason: string }[] = [];

	const filePaths = await agent.getOrganizableFilePaths();
	const existingPaths = new Set(filePaths);

	const validPaths: string[] = [];
	for (const path of deletePaths) {
		if (!existingPaths.has(path)) {
			failed.push({ path, reason: 'File does not exist' });
		} else {
			validPaths.push(path);
			deleted.push(path);
		}
	}

	if (validPaths.length > 0) {
		await agent.deleteOrganizedFiles(validPaths);
	}

	logger.info('File deletion complete', {
		deleted: deleted.length,
		failed: failed.length,
	});

	return { action: 'delete', result: { deleted, failed } };
}
