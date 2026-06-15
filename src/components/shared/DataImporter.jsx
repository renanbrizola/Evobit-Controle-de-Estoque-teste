import React, { useState, useRef } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Upload, Download, FileSpreadsheet, Check, AlertTriangle, X, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

const DataImporter = ({ type, onImport, onExportData, templates }) => {
    const [file, setFile] = useState(null);
    const [previewData, setPreviewData] = useState([]);
    const [errors, setErrors] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const fileInputRef = useRef(null);

    const handleDownloadTemplate = () => {
        const template = templates[type];
        if (!template) return;

        const ws = XLSX.utils.json_to_sheet([template.example]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Modelo");
        XLSX.writeFile(wb, `modelo_importacao_${type}.xlsx`);
    };

    const sanitizeInput = (str) => {
        if (typeof str !== 'string') return str;
        return str.replace(/[<>]/g, '').trim(); // Remove fundamental XSS vectors
    };

    const processFile = async (e) => {
        const selectedFile = e.target.files[0];
        if (!selectedFile) return;

        setFile(selectedFile);
        setIsProcessing(true);
        setErrors([]);

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const bstr = evt.target.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const rawData = XLSX.utils.sheet_to_json(ws);

                // Sanitize ALL string inputs immediately
                const data = rawData.map(row => {
                    const sanitizedRow = {};
                    Object.keys(row).forEach(key => {
                        sanitizedRow[key] = sanitizeInput(row[key]);
                    });
                    return sanitizedRow;
                });

                validateData(data);
            } catch (error) {
                console.error(error);
                toast.error("Erro ao ler arquivo. Verifique se é um Excel válido.");
                setFile(null);
            } finally {
                setIsProcessing(false);
            }
        };
        reader.readAsBinaryString(selectedFile);
    };

    const validateData = (data) => {
        const validationErrors = [];
        const validRows = [];
        const rules = templates[type].rules;

        data.forEach((row, index) => {
            const rowErrors = [];

            // Required Fields
            rules.required.forEach(field => {
                if (!row[field]) rowErrors.push(`Campo obrigatório ausente: ${field}`);
            });

            // Type Checks (Basic)
            rules.numbers.forEach(field => {
                if (row[field] && isNaN(row[field])) rowErrors.push(`Campo deve ser numérico: ${field}`);
            });

            if (rowErrors.length > 0) {
                validationErrors.push({ row: index + 2, errors: rowErrors }); // +2 because Excel 1-indexed + header
            } else {
                validRows.push(row);
            }
        });

        setErrors(validationErrors);
        setPreviewData(validRows);
    };

    const confirmImport = () => {
        if (previewData.length === 0) {
            toast.error("Nada para importar.");
            return;
        }
        onImport(previewData);
        setFile(null);
        setPreviewData([]);
        setErrors([]);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    return (
        <Card className="border-2 border-dashed border-gray-200">
            <div className="flex flex-col items-center gap-4 text-center p-4">
                <div className="p-3 bg-brand-light rounded-full">
                    <FileSpreadsheet size={32} className="text-brand-primary" />
                </div>

                <div>
                    <h3 className="font-bold text-lg text-brand-dark">Importar / Exportar {type === 'products' ? 'Produtos' : 'Fornecedores'}</h3>
                    <p className="text-sm text-gray-400 max-w-sm mx-auto">
                        Baixe o modelo, preencha seus dados e envie de volta para cadastro em massa.
                    </p>
                </div>

                <div className="flex gap-3 justify-center flex-wrap">
                    <Button variant="ghost" onClick={handleDownloadTemplate} size="sm">
                        <Download size={16} className="mr-2" />
                        Baixar Modelo
                    </Button>

                    {onExportData && (
                        <Button variant="outline" onClick={onExportData} size="sm">
                            <Download size={16} className="mr-2" />
                            Exportar Dados
                        </Button>
                    )}

                    {onImport && (
                        <div className="relative group">
                            <input
                                type="file"
                                accept=".xlsx, .xls, .csv"
                                onChange={processFile}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                                ref={fileInputRef}
                                disabled={isProcessing}
                                title="Clique para selecionar um arquivo"
                            />
                            <Button size="sm" disabled={isProcessing} className="relative z-10 pointer-events-none group-hover:bg-brand-dark transition-colors">
                                {isProcessing ? <Loader2 className="animate-spin mr-2" /> : <Upload size={16} className="mr-2" />}
                                Carregar Arquivo
                            </Button>
                        </div>
                    )}
                </div>

                {/* Validation Feedback */}
                {file && (
                    <div className="w-full mt-4 bg-gray-50 rounded-xl p-4 text-left animate-in slide-in-from-top-2">
                        <div className="flex justify-between items-center mb-2">
                            <span className="font-bold text-sm text-gray-700">Arquivo: {file.name}</span>
                            <button onClick={() => {
                                setFile(null);
                                setPreviewData([]);
                                setErrors([]);
                                if (fileInputRef.current) fileInputRef.current.value = "";
                            }} className="text-gray-400 hover:text-red-500">
                                <X size={16} />
                            </button>
                        </div>

                        {errors.length > 0 && (
                            <div className="mb-3 p-3 bg-red-50 border border-red-100 rounded-lg text-xs text-red-600 max-h-32 overflow-y-auto">
                                <p className="font-bold mb-1 flex items-center gap-1">
                                    <AlertTriangle size={12} />
                                    {errors.length} linhas com erro (ignoradas):
                                </p>
                                <ul className="list-disc pl-4 space-y-1">
                                    {errors.map((e, i) => (
                                        <li key={i}>Linha {e.row}: {e.errors.join(', ')}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <div className="flex items-center justify-between">
                            <div className="text-sm">
                                <span className="font-bold text-green-600">{previewData.length}</span> registros válidos prontos.
                            </div>
                            <Button onClick={confirmImport} disabled={previewData.length === 0} size="sm" className="bg-green-600 hover:bg-green-700 text-white">
                                <Check size={16} className="mr-2" />
                                Confirmar Importação
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </Card>
    );
};

export default DataImporter;
