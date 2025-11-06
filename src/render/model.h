#pragma once
#include "mesh.h"
#include <tiny_gltf.h>
#include <iostream>

class Model {
public:
    std::vector<Mesh> meshes;

    Model(const std::string &path) { loadModel(path); }

    void Draw(GLuint shaderID) {
        for (auto &mesh : meshes) mesh.Draw(shaderID);
    }

private:
    void loadModel(const std::string &path) {
        tinygltf::Model gltfModel;
        tinygltf::TinyGLTF loader;
        std::string err, warn;

        bool ret = loader.LoadASCIIFromFile(&gltfModel, &err, &warn, path);
        if (!ret) { std::cerr << "Failed to load: " << path << std::endl; return; }

        if (!gltfModel.meshes.empty()) {
            const auto &meshData = gltfModel.meshes[0];
            const auto &primitive = meshData.primitives[0];

            std::vector<Vertex> vertices;
            std::vector<unsigned int> indices;

            auto posAccessor = gltfModel.accessors[primitive.attributes.find("POSITION")->second];
            auto posView = gltfModel.bufferViews[posAccessor.bufferView];
            auto posBuffer = gltfModel.buffers[posView.buffer];
            const float* pos = reinterpret_cast<const float*>(&posBuffer.data[posView.byteOffset + posAccessor.byteOffset]);

            for (size_t i = 0; i < posAccessor.count; i++) {
                Vertex vert;
                vert.Position = glm::vec3(pos[i*3], pos[i*3+1], pos[i*3+2]);
                vert.Normal = glm::vec3(0.0f, 0.0f, 1.0f); // placeholder
                vert.TexCoords = glm::vec2(0.0f, 0.0f);    // placeholder
                vertices.push_back(vert);
            }

            auto indexAccessor = gltfModel.accessors[primitive.indices];
            auto indexView = gltfModel.bufferViews[indexAccessor.bufferView];
            auto indexBuffer = gltfModel.buffers[indexView.buffer];
            const unsigned short* idx = reinterpret_cast<const unsigned short*>(&indexBuffer.data[indexView.byteOffset + indexAccessor.byteOffset]);

            for (size_t i = 0; i < indexAccessor.count; i++) indices.push_back(idx[i]);

            meshes.push_back(Mesh(vertices, indices, {}));
        }
    }
};
